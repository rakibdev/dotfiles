#!/bin/bash

hour=$(date +"%H")

if [ $hour -ge 18 ]; then
    # Evening (6 PM and after)
    ddcutil setvcp 10 20
else
    # Day time (before 6 PM)
    ddcutil setvcp 10 70
fi 