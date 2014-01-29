#!/usr/bin/env python

import argparse
import boto.ec2
import os
import simplejson
import subprocess
import sys
import time
import urllib2

cli = argparse.ArgumentParser(description='Update a Reverse DNS entry with a DNS server.')
cli.add_argument('dns', help='DNS server', metavar='IP')
cli.add_argument('keypath', help='DNS private key to use for updates')
cli.add_argument('ip', help='Local IP for the pointer')
cli.add_argument('pointer', help='FQDN pointer value')
cli.add_argument('--verbose', '-v', action='count', help='Use multiple times to increase verbosity: none = quiet, 1 = completions, 2 = summaries, 3 = details')

cliargs = cli.parse_args()


#
# setup our basics
#

DEVNULL = open(os.devnull, 'w')

if cliargs.verbose > 2:
  TASK_STDOUT = sys.stdout
  TASK_STDERR = sys.stderr
else:
  TASK_STDOUT = DEVNULL
  TASK_STDERR = DEVNULL


#
# ready, set, go...
#

stdout = []
stdout.append('server %s' % cliargs.dns)
stdout.append('zone %s.in-addr.arpa' % '.'.join(reversed(cliargs.ip.split('.')[:-1])))
stdout.append('update delete %s.in-addr.arpa PTR' % '.'.join(reversed(cliargs.ip.split('.'))))
stdout.append('update add %s.in-addr.arpa 300 PTR %s' % ( '.'.join(reversed(cliargs.ip.split('.'))), cliargs.pointer ))
stdout.append('send')

if cliargs.verbose > 1:
  sys.stdout.write('sending dns update...\n')

p = subprocess.Popen(
  '/usr/bin/nsupdate -k %s' % cliargs.keypath,
  shell = True,
  stdin = subprocess.PIPE,
  stdout = DEVNULL,
  stderr = DEVNULL,
)

p.communicate(input = '\n'.join(stdout))

if 0 < p.returncode:
  raise RuntimeError('nsupdate returned %s' % p.returncode)

if cliargs.verbose > 0:
  sys.stdout.write('sent dns update\n')
