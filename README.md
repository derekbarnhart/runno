runno (NOTE: currently in ALPHA)
=====

Simple job runner for command line tasks with complex dependencies

##Purpose

runno lets you define 'jobs' which are simply collections of command line tasks. 
Interestingly, tasks can depend on other tasks, or schedules. This lets you easily build jobs by focussing on what each task needs to run successfully and simply let runno figure out the order in which to run them then execute that order.


##Features
1) Jobs composed of multiple tasks

2) Tasks can have dependencies on other tasks

3) Tasks can be scheduled 

4) Custom config arguments per job (using [Optimist][optimist_github]) 

5) Templating sytem for task commands (using [Handlebars][handlebars_web])



## Usage

**node runno -j [path to jobfile ] [arguments ...]**

``` node runno -j ./examples/basic-job.yml ```


[moment_github]: https://github.com/moment/moment
[moment_web]:http://momentjs.com/docs/

[optimist_github]:https://github.com/substack/node-optimist

[handlebars_github]:https://github.com/wycats/handlebars.js/
[handlebars_web]: http://handlebarsjs.com/


## Job File



Job files can be either json or [yaml](http://www.keleshev.com/yaml-quick-intoduction).

*All examples will be in yaml because its prettier*

**Note:** If using yaml you must use the `.yml` extention when you run the job)


_**Checkout the [example job files](https://github.com/derekbarnhart/runno/tree/master/examples)**_



### Structure
1. **arguments** - Configuration of arguments required by the job (see [arguments section](https://github.com/derekbarnhart/runno/edit/master/README.md#arguments))
2. **tasks** - A list of task definitions



Example using YAML:
```
--- samplejob.yml

arguments:
  --- (object)
tasks:
  --- (array)
 
``` 





Pretty simple eh?

The file is basically just a list of tasks. Each task is structured like this:



```
  id: task-id
  cmd: >
    echo I am a command line task. I can contain anything
  dependencies:
    - that-first-task
    - this-other-task
```




Property | Type | Purpose
---|---|---
id | string | A reference so other tasks can mark this as a dependency
cmd | string | A string that will be run as a command. Can use handlebar style (ex.{{variable}}) placeholders populated from the [arguments](https://github.com/derekbarnhart/runno/edit/master/README.md#arguments) configuration
dependencies | array | A list of task ids corresponding to tasks that must complete before this task will be run
schedule | array | An array of 2 items describing the time that this task should be run **Note**: Any task depending on this task will logically be delayed until this time transpires


Each task simply contains an id for reference, the command that is will run, and a list of any other tasks that need to complete before it should be run.



###Sample Job
A simple job might look like this:



```
--- samplejob.yml
tasks:
-
    --- A generic task 
    id: task-one
    cmd: >
      echo This is task-one reporting >> jobs.log
    dependencies: []
  
  -
    --- A task that simulates processing with sleep
    id: another-task
    cmd: >
      sleep 5; echo I just slept a bit >> jobs.log
    dependencies: 
      - task-one
```

This simple job just echos some data into a log file but enforces the dependency that task-one must run before another-task will execute. 

Also note that if you choose yaml as your format you can comment each of your tasks so you know what they are for.





### Advanced JobFiles

runno also implements an command line argument system so you can pass configurations into your jobs and then allow the templating system to interpolate your task's commands with those configurations




#### Arguments
As you may have noticed in the sample structure above, runno includes an *arguments* section in the jobfile. This is where all your configurations can go for the command line. runno uses [Optimist][optimist_github] for argument parsing for each job so you can build your arguments on the structure supported by optimists 'options' method call.

ex.
```
arguments:
 sleeptime:
    demand: true
    description: The amount of time to make the second command sleep before completing
  logfile:
    default: argjob.log
```
The above will create 2 options for your job.

<dl>
  <dt>sleeptime</dt>
  <dd>is required so will hault your script from running if you dont pass it in as an argument</dd>

  <dt>logfile</dt>
  <dd>already has a default so it will already be available within your command templates</dd>
</dl>

(see the [optimist repo][optimist_github] for more details on this format)

You can pass in arguments for a script that uses these arguments like this:

```
node runno -j myscript.yml --sleeptime 10 --logfile /path/to/mylogfile.log

```




#### Command Templates

Once the arguments have been collected for your job (either passed in or defaults) an options object will be used in interpolating the cmd property on each task defined in the job. The templating sytem used is [Handlebars][handlebars_web]. So to write commands that would work with the above arguments we would simply do something like this:

```
tasks:
  -
    id: task-one
    cmd: >
      sleep {{sleeptime}}; echo This is task-one reporting >> {{logfile}}
    dependencies: []
  
```

Anything you can put in a handlebars template you can put in your command templates.

(See [Handlebars][handlebars_web] for more information - [repo][handlebars_github])



### Schedule dependency

Perhaps in addition to a script having dependencies on other scripts running first it must also wait until a specific time has passed. The schedule property can be provided to allow this funtionality.

The schedule property accepts an array containing 2 elements
- A string representing the time the script should be run ex. "03 00 AM"
- A string defining the format used in the first element ex. "h m a"

runno uses the [Moment.js][moment_web] library to provide this funtionality. 

(see [Moment.js][moment_web] documentation for more details - [repo][moment_github])

usage :

```
-
    --- A scheduled task 
    id: task-one
    schedule:
      - 11 06 AM
      - h m a
    cmd: >
      echo Its 11 06 AM
    dependencies: []
    
```

**NOTE:** This feature is not intended to be used to schedule recurring tasks or jobs. The job should be initiated by a cron job and the schedule task can be used to control the timing of tasks within that job.

##Roadmap

Features to be added:

Built in logging functionality - Currently you can just pipe to a file '>> logfile.log'

Error handling behavior - Currently continues on to next script reguardless of success or failure of task

Restart protection with serialization of progress 








