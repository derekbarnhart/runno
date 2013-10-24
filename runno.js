#! /usr/bin/env node

var Q = require('q')
var _ = require('lodash')
var exec = require('child_process').exec;
var moment = require('moment')
var YAML = require("yamljs")
var handlebars = require('handlebars')
var argv = require('optimist')
    .usage('Usage: runno -j [path to job file] [arg 1] [arg 2] ... [arg n]')
    .options('job', { demand:true, string:true, alias:'j' }).argv

var defers = {};
var initialThreads = []

try {
    var yamlRe = new RegExp('.yml')
    var job = null;

    if(argv.job.match(yamlRe)){
        job = YAML.load(argv.job)

    } else {

        job = require(argv.job);
    }

    var arguments = typeof job.arguments != 'undefined' ? job.arguments : {}
    var jobFile = job.tasks
    var customArgv = require('optimist')
        .options(arguments).argv

} catch(e){
    console.error("Job not found: "+ argv.job)
    console.dir(e)
    process.exit(-1)

}

var scripts = _.indexBy(jobFile,'id')

function gatherDepErrors(dependencies){
    
    var dependencyErrors = []

    for(var dep in dependencies){
        if(!scripts.hasOwnProperty(dependencies[dep])){
            dependencyErrors.push(dependencies[dep])
        }
    }
    return dependencyErrors;
}


for(var item in scripts){
    var depErrors = gatherDepErrors(scripts[item].dependencies)

    //Validate the dependencies
    if(depErrors.length>0){
        console.log('Problem with dependancies:')
        console.log('Script Id : '+item)
        console.log('Dependencies: ['+ depErrors.join(', ')+']')
        process.exit(-1)
    }

    /*
        Set up the retries incase a script fails
    */
    if(scripts[item].hasOwnProperty('retry')){
        scripts[item].retry = parseInt(scripts[item].retry)   
    } else {
        scripts[item].retry = 0
    }

    /*
        Add Scheduling Functionality
    */
    if(scripts[item].hasOwnProperty("schedule")){
        var time = moment.apply(this,scripts[item].schedule)
        var timeName = item+"_time"+time.format("HHmmss");
        defers[timeName] = Q.defer()
        if(time.isBefore(moment())){
            defers[timeName].resolve()
        }else{
            var delay =   time.diff(moment(), 'milliseconds', true);
            setTimeout(defers[timeName].resolve,delay)
        }

            scripts[item].dependencies.push(timeName)
    }


     /*
        Add options functionality through handlebars templates
     */

    var template = handlebars.compile(scripts[item].cmd)
    scripts[item].cCmd = template(customArgv);
    defers[item] = Q.defer();
}


function setupDependencies(id,promiseList){
    Q.all( promiseList ).then( 
        //Success handler
        function(){
        
        console.log('Previous resolved with: ',arguments)

        var executionCount = 0;
        var executeScript = function(){
            executionCount += 1;

            exec(scripts[id].cCmd, function(error,output,code){
            
            console.log(id + ' Output', output )

            if(error)
            {
               
                console.log(id + ' Failed')
                console.log('Output', output ) 
                
               

                if(scripts[id].retry > executionCount) 
                {
                    executeScript()

                } else {

                    defers[id].reject()
                }
            
            } else {
            
                console.log(id+' Succeeded')
                defers[id].resolve()
            }            
        })
        } 
         executeScript()   
    },
        //Failure handler
        function(){
            console.log('Previous rejected with: ',arguments)
            console.dir('Something failed')
        })
}

for(var id in scripts){
    if(scripts[id].dependencies.length == 0){

        initialThreads.push(scripts[id])

    } else {
        var depPromiseList = [];

        for(var i = 0; i <scripts[id].dependencies.length; i ++){
            depPromiseList.push(defers[scripts[id].dependencies[i]].promise)
        }
        //Set up promise to run


        setupDependencies(id,depPromiseList)


    }
}

var triggerDefer = Q.defer();

//Initial thread scripts
Q.all([triggerDefer.promise]).then(function(){
    for(var iThread in initialThreads){
        setupDependencies(initialThreads[iThread].id,[])
    }
})

triggerDefer.resolve()
