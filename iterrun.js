#!/usr/bin/env node

var async = require('async');
var exec = require('child_process').exec;
var handlebars = require('handlebars')
var _ = require('lodash')
var printf = require('printf');
var YAML = require("yamljs")
var _ = require("lodash")
var argv = require('optimist')
    .usage('Usage: runno -j [path to job file] [arg 1] [arg 2] ... [arg n]')
    .options('job', { demand:true, string:true, alias:'j' }).argv
var winston = require('winston')

winston.loggers.add('fileLogger', {
    console: {
        colorize: 'true'
    }
});


//console.log(printf("%02d", 1))


//process.exit(0)

var fileLog = winston.loggers.get('fileLogger')
//This will be the task queue for all the commands to be run
var q = async.queue(
    
    function(task,callback){
        //Keep track of the performance of this item
        fileLog.profile(task.id)
        //Execute the actual task
        exec(task.cmd,function(err,out,code){
            if(err){
                fileLog.log('error',arguments)
            }
            callback(err,task);
        });
    }, 
    require('os').cpus().length ); // <-- Sets the total number of concurrent threads

//This gets called when all items in the queue have finished
q.drain = function(){
    fileLog.profile("process queue")
		setTimeout(function(){process.exit(0)},2000);
};

var addToQueue = function(item){
    q.push(item,function(err){
        if(err) {
            fileLog.log("info", "Error processing "+item.id, {error:err})
        }
        fileLog.profile(item.id)
    });
}


//Handle the arguments
try {
    var yamlRe = new RegExp('.yml')
    var job = null;

    if(argv.job.match(yamlRe)){
        job = YAML.load(argv.job)

    } else {

        job = require(argv.job);
    }

    var arguments = typeof job.args != 'undefined' ? job.args : {}
    var jobFile = job.tasks
    var customArgv = require('optimist')
        .options(arguments).argv

} catch(e){
    console.error("Job not found: "+ argv.job)
    console.dir(e)
    process.exit(-1)

}

var template = handlebars.compile(job.cmd)

launch(job.loop, customArgv)

function launch(loop, itervars){
	itervars = typeof itervars != 'undefined' ? itervars : {}


//Validate loopObject

if(loop.hasOwnProperty("end")){

    var i = loop.hasOwnProperty("start")? loop.start : 0;
    var step = loop.hasOwnProperty("step")? loop.step : 1;

	for(i; i < loop.end; i+=step)
	{	

		var thisItervar = loop.hasOwnProperty("format") ? printf(loop.format,i): i;
        itervars[loop.var] = thisItervar;

		if(loop.hasOwnProperty("loop")){

			launch(loop.loop, itervars )

		} else {
			var compiledCmd = template(itervars);
			
			addToQueue({id:_.uniqueId(),cmd:compiledCmd})
			
			console.log(compiledCmd)
		}

	}
} else if(loop.hasOwnProperty("list")){

	for(var item in loop.list){
		
			itervars[loop.var] = loop.list[item];

			if(loop.hasOwnProperty("loop")){

				launch(loop.loop, itervars )

			} else {
				var compiledCmd = template(itervars);
				
				addToQueue({id:_.uniqueId(),cmd:compiledCmd})
				
				console.log(compiledCmd)
			}

	}

} else {

	//Invalid format

}

//Check if its a list or a count

//



}



