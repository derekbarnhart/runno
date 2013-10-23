#! /usr/bin/env node

var Q = require('q')
var _ = require('lodash')
var exec = require('child_process').exec;
var moment = require('moment')
var YAML = require("yamljs")
var handlebars = require('handlebars')
var argv = require('optimist')
    .options('job', { demand:true, string:true, alias:'j' }).argv

var defers = {};
var initialThreads = []

try {
    var yamlRe = new RegExp('.yml')
    var job = null;

    if(argv.job.match(yamlRe)){

        console.log('Its Yaml')

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
            console.log("delay",delay)
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
    Q.all( promiseList ).then( function(){
        exec(scripts[id].cCmd, function(error,output,code){
            console.log(id+' Finished')

            defers[id].resolve()
        })
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
