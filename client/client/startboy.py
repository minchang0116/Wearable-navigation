# -*- coding: utf-8 -*-

import pygame
import snowboydecoder
import sys
import signal
import transcribe_streaming_mic
import time
import client
import boto3

reload(sys)
interrupted = False
global num
num = 0
global flag
flag = 1
pollyClient = boto3.client('polly')


def signal_handler(signal, frame):
    global interrupted
    interrupted = True


def interrupt_callback():
    global interrupted
    return interrupted


def sound():
    pygame.init()
    beep = pygame.mixer.Sound('ask_tts.ogg')
    beep.play()


cmdLists = [
    ['취소', 'cancel route.mp3', 3],
    ['길 안내', 'desSAY.mp3', 1],
    ['다시', 'origin.mp3', 4]
]


def start():
    detector.start(detected_callback=callback,
                   interrupt_check=interrupt_callback,
                   sleep_time=3)


def callback():
    global num
    global flag
    pygame.mixer.init()
    flag = 1
    detector.terminate()
    if num > 0:
        print('close thread')
        client.stop_threads = True
        # 명령을 말하세요
        pygame.mixer.music.load('tell command.mp3')
        pygame.mixer.music.play()
        flag = 2
        while flag == 2:
            print('say!!')
            sttdst = transcribe_streaming_mic.main()
            for cmdList in cmdLists:
                if sttdst == cmdList[0]:
                    pygame.mixer.music.load(cmdList[1])
                    pygame.mixer.music.play()
                    flag = cmdList[2]
            if flag == 2:
                print('say again')
                pygame.mixer.music.load('tell me again.mp3')
                pygame.mixer.music.play()
            elif flag == 3:
                start()
                break

            elif flag == 4:
                flag = 2
                client.main()
                start()
                break

    num = num + 1

    while flag == 1:

        print('say destination')
        # 목적지를 말하세요
        pygame.mixer.music.load('desSAY.mp3')
        pygame.mixer.music.play()
        sttdst = transcribe_streaming_mic.main()

        # 맞냐고 다시 물어보기
        s = sttdst+"가 맞습니까?"

        response1 = pollyClient.synthesize_speech(
            Text=s, OutputFormat="ogg_vorbis", VoiceId="Seoyeon")

        stream = response1.get("AudioStream")

        with open('ask_tts.ogg', 'wb') as f:
            sdata = stream.read()
            f.write(sdata)
        sound()
        print('say yes or no!!')
        yesorno = transcribe_streaming_mic.main()

        yesorno = yesorno.strip()

        if (yesorno == "아니요") or (yesorno == "아니") or (yesorno == "아니야"):
            continue

        else:
            print('시작')
            pygame.mixer.music.load('start_wait.mp3')
            pygame.mixer.music.play()
            time.sleep(3)
            client.snd_destination(sttdst)
            pygame.mixer.music.stop()
            flag = 2
            client.main()
            start()
            break


if len(sys.argv) == 1:
    print("Error: need to specify model name")
    print("Usage: python startboy.py your.model")
    sys.exit(-1)

model = sys.argv[1]

# capture SIGINT signal, e.g., Ctrl+C
signal.signal(signal.SIGINT, signal_handler)


detector = snowboydecoder.HotwordDetector(model, sensitivity=1)
print('Listening... Press Ctrl+C to exit')

# main loop
detector.start(detected_callback=callback,
               interrupt_check=interrupt_callback,
               sleep_time=10)

detector.terminate()
