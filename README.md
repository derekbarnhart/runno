runno
=====

Simple job runner for command line tasks with complex dependencies



runno lets you define 'jobs' which are simply collections of command line tasks to be executed. The interesting feature is that tasks can depend on other tasks having completed first or a specific time to have passed. This lets you easily build jobs with complex dependencies and simply let runno figure out the order in which to run them.



## Usage


node runno -j [path to jobfile ] [arguments ...]

```
node runno -j ./examples/basic-job.yml

```


### Job File

Job files can be either json or yaml. Here is an example structure:


```
--- samplejob.yml

arguments:
  
tasks:
 
```

Pretty simple eh?

It is basically just a list of tasks. Each task is structured like this:

```
id: task-id
    cmd: >
      echo I am a command line task. I can contain anything
    dependencies:
      - that-first-task
      - this-other-task
```

Each task simply contains an id for reference, the command that is will run, and a list of any other tasks that need to complete before it should be run.


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
As you may have noticed in the sample structure above, runno includes an 'arguments' section in the jobfile. This is where all your configurations can go for the command line. runno uses optimist for argument parsing for each job so you can build your arguments on the structure supported by optimists 'options' method call.

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
sleeptime is required so will hault your script from running if you dont pass it in as an argument
logfile already has a default so it will already be available within your command templates

(see the optimist project for more details on this format)

You can pass in arguments for a script that uses these arguments like this:

```
node runno -j myscript.yml --sleeptime 10 --logfile /path/to/mylogfile.log

```
#### Command Templates

Once the arguments have been collected for your job (either passed in or defaults) an options object will be used in interpolating the cmd property on each task defined in the job. The templating sytem used is handlebars. So to write commands that would work with the above arguments we would simply do something like this:

```
tasks:
  -
    id: task-one
    cmd: >
      sleep {{sleeptime}}; echo This is task-one reporting >> {{logfile}}
    dependencies: []
  
```

Anything you can put in a handlebars template you can put in your command templates.

(See handlebars for more information)



### Schedule dependency

Perhaps in addition to a script having dependencies on other scripts running first it must also wait until a specific time has passed. The schedule property can be provided to allow this funtionality.

The schedule property accepts an array containing 2 elements
- A string representing the time the script should be run ex. "03 00 AM"
- A string defining the format used in the first element ex. "h m a"

runno uses the moment.js library to provide this funtionality. (see moment.js documentation for more details)

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



