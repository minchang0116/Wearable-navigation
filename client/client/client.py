# -*- coding: utf-8 -*-
#! /usr/bin/python
from gps import *
from multiprocessing import Process
from datetime import datetime
from threading import Thread
import threading

import boto3
import time
import picamera
import sys
import pygame
import os
import re
import pyaudio
import socket

HOST = '116.127.156.34'
PORT = 6112

gpsd = None

global stop_threads
global total_distance
global stop_camera
global gpsp
global th1
global th2

reload(sys)
sys.setdefaultencoding('utf-8')
dynamodb = boto3.resource('dynamodb')
pillyClient = boto3.client('polly')
table_total = dynamodb.Table('yapyap-total')
table_start = dynamodb.Table('yapyap-destination')
table_location = dynamodb.Table('yapyap-update-location')
table_navi = dynamodb.Table('yapyap-last-distance')
gpsd = gps(mode=WATCH_ENABLE | WATCH_NEWSTYLE)
pygame.mixer.init()


class GpsPoller(threading.Thread):
    def __init__(self):
        threading.Thread.__init__(self)
        global gpsd  # bring it in scope
        gpsd = gps(mode=WATCH_ENABLE)  # starting the stream of info
        self.current_value = None
        self.running = True  # setting the thread running to true

    def run(self):
        global gpsd
        while gpsp.running:
            gpsd.next()


def sendFileFromClient():

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((HOST, PORT))

    with picamera.PiCamera() as cam:
        cam.capture('image.jpg')

    filename = 'image.jpg'
    with open(filename, 'rb') as f:
        try:
            data = f.read(1024)
            while data:
                sock.send(data)
                data = f.read(1024)
        except Exception as e:
            print(e)

    sock2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock2.connect((HOST, 6113))

    data2 = sock2.recv(1024)
    print(data2)

    sign = data2.decode()
    print(sign)
    if sign == '1':
        print "red"
        return ("red")
    elif sign == '2':
        print "blue"
        return ("blue")
    else:
        print "none"
        return ("none")
    sock.close()
    sock2.close()


def start_msg():
    global total_distance

    response = table_total.scan()
    data = response[u'Items']
    total_distance = data[0]['totalDistance']
    totalTime = data[0]['totalTime']
    s = "남은거리는 총 "+str(total_distance)+"미터 입니다. 예상 소요시간은 " + \
        str(totalTime)+"분 입니다. 안내를 시작하겠습니다."
    print s
    response1 = pillyClient.synthesize_speech(
        Text=s, OutputFormat="ogg_vorbis", VoiceId="Seoyeon")

    stream = response1.get("AudioStream")

    with open('aws_tts.ogg', 'wb') as f:
        sdata = stream.read()
        f.write(sdata)
    print "start_msg_complete"
    sound()


def send_location():
    global gpsp
    try:

        while True:

            lat1 = str(gpsd.fix.latitude)
            lon1 = str(gpsd.fix.longitude)

            # lat1 = "36.143510"
            # lon1 = "128.392785"

            print lat1
            print lon1
            print "send_location"
            print str(datetime.now())+"---------send_location START"
            if lat1 != "0.0" or lon1 != "0.0":
                table_location.update_item(
                    Key={
                        'NUMBER': "1"
                    },
                    UpdateExpression="set startX =:r, startY=:p",
                    ExpressionAttributeValues={
                        ':r': lon1,
                        ':p': lat1
                    },
                    ReturnValues="UPDATED_NEW"
                )
            print "send complete"
            print str(datetime.now())+"---------send_location COMPLETE"
            time.sleep(2)

            global stop_threads
            if stop_threads:
                gpsp.running = False
                gpsp.join()
                th1.join()
                break
    except (KeyboardInterrupt, SystemExit):  # when you press ctrl+c
        print "Done.\nExiting."
    return


def rec_db():
    global th2
    global stop_threads
    pre_total_distance = 20001

    try:
        while True:
            print str(datetime.now())+"---------rec_data START"
            response = table_navi.scan()
            data = response[u'Items']
            print str(datetime.now())+"---------rec_data COMPLETE"

            distance = data[0]['distance']
            distance = distance-6
            if distance < 0:
                distance = 0
            turnType = data[0]['turnType']
            cur_total_distance = data[0]['totalDistance']

            if "횡단보도" in turnType and (distance) < 5:
                d = str(distance)
                t = str(turnType)
                s = d+"미터 앞 "+t+"입니다."
                print s

                print str(datetime.now())+"-----TTS START"
                print "-------------------"
                response1 = pillyClient.synthesize_speech(
                    Text=s, OutputFormat="ogg_vorbis", VoiceId="Seoyeon")

                stream = response1.get("AudioStream")

                with open('aws_tts.ogg', 'wb') as f:
                    sdata = stream.read()
                    f.write(sdata)
                sound()
                print str(datetime.now())+"-----TTS COMPLETE"

                pre_light = sendFileFromClient()
                start_camera = time.time()
                end_flag = False
                while "none" in pre_light:
                    pre_light = sendFileFromClient()
                    end_camera = time.time()
                    if end_camera-start_camera > 15:
                        end_flag = True
                        pygame.mixer.music.load('nodetected.mp3')
                        pygame.mixer.music.play()
                        break

                flag = 0
                print 'wait'
                pygame.mixer.music.load('waitforsecond.mp3')
                pygame.mixer.music.play()
                while not end_flag:
                    light = sendFileFromClient()
                    if flag == 0:

                        if pre_light != light and "none" not in light:
                            pre_light = light
                            flag = 1
                        elif 'red' in pre_light:
                            pygame.mixer.music.load('redsign.mp3')
                            pygame.mixer.music.play()
                            flag = 1

                    elif 'blue' in light and flag == 1:
                        print 'blue go'
                        pygame.mixer.music.load('greensign.mp3')
                        pygame.mixer.music.play()
                        end_flag = True
                        time.sleep(5)
                        response = table_navi.scan()
                        data = response[u'Items']
                        distance = data[0]['distance']
                        turnType = data[0]['turnType']
                        cur_total_distance = data[0]['totalDistance']

                    elif 'red' in light and flag == 1:
                        print 'red stop'
                        pygame.mixer.music.load('redsign.mp3')
                        pygame.mixer.music.play()

            if pre_total_distance < cur_total_distance:
                print "잘못된 경로로 가고있다."
                pygame.mixer.music.load("reverse.mp3")
                pygame.mixer.music.play()
                pre_total_distance = cur_total_distance
            else:
                d = str(distance)
                t = str(turnType)
                s = d+"미터 앞 "+t+"입니다."
                print s

                print str(datetime.now())+"-----TTS START"
                print "-------------------"
                response1 = pillyClient.synthesize_speech(
                    Text=s, OutputFormat="ogg_vorbis", VoiceId="Seoyeon")

                stream = response1.get("AudioStream")

                with open('aws_tts.ogg', 'wb') as f:
                    sdata = stream.read()
                    f.write(sdata)
                sound()
                print str(datetime.now())+"-----TTS COMPLETE"
                pre_total_distance = cur_total_distance

                if "목적지" in t and (distance) < 5:
                    stop_threads = True
                    pygame.mixer.music.load("arrive.mp3")
                    pygame.mixer.music.play()
            time.sleep(5)

            if stop_threads:
                th2.join()
                break
    except (KeyboardInterrupt, SystemExit):  # when you press ctrl+c
        print "Done.\nExiting."
    return


def snd_destination(dstName):
    while True:
        report = gpsd.next()
        if report['class'] == 'TPV':
            lat = getattr(report, 'lat', 0)
            lon = getattr(report, 'lon', 0)

            lat1 = str(lat)
            lon1 = str(lon)

            # lat1 = "36.143510"
            # lon1 = "128.392785"

            print lat1
            print lon1
            print "send_dst_location"
            if lat1 != "0" or lon1 != "0":
                table_start.update_item(
                    Key={
                        'NUMBER': "1"
                    },
                    UpdateExpression="set Destination=:q, destX=:r, destY=:p",
                    ExpressionAttributeValues={
                        ':q': dstName,
                        ':r': lon1,
                        ':p': lat1
                    },
                    ReturnValues="UPDATED_NEW"
                )
                print "send_dst_complete"
                print str(datetime.now())
                print "-------------------"
                break


def sound():
    pygame.init()
    beep = pygame.mixer.Sound('aws_tts.ogg')
    beep.play()


def main():
    global gpsp
    global th1
    global th2

    global stop_threads
    stop_threads = False

    gpsp = GpsPoller()
    gpsp.start()

    th1 = Thread(target=send_location, args=())
    th1.start()
    time.sleep(10)
    start_msg()
    time.sleep(10)
    th2 = Thread(target=rec_db, args=())

    th2.start()

    print "exit_mian"
