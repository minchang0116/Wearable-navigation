

### 개발기간 
2019년 3월 27일 ~ 2019년 6월 23일
### 팀원

| **사진** | **팀원**      | **역할**                                                     | **기여도** |
| -------- | ------------- | ------------------------------------------------------------ | ---------- |
|          | 팀장 : 고지훈 | 라즈베리파이 모듈(STT, TTS, HotWord 감지, GPS 등) 설치 및 클라이언트 코드 작성, AWS 설계 | 27.6       |
|          | 팀원 : 강민창 | 영상 처리 및 객체 감지, 전체적인 디버깅 담당                 | 27.6       |
|          | 팀원 : 김동욱 | 영상 처리 및 이미지 학습 개선 지원.디바이스 구성 지원.       | 17.2       |
|          | 팀원 : 박준수 | 내비게이션 구현하기 위한 AWS 설계 및 구현.                  | 27.6       |



## 1. 서론

1️⃣ **개발 목표**

시각장애인들은 자신이 가보지 않았던 목적지에는 주변 사람의 도움이 없으면 스스로 가기에 어려움이 있다. 시각장애인들이 근처(~20km) 이내의 장소를 웨어러블 디바이스를 통해 음성으로 검색하여 보행자용 길을 음성으로 안내받는 디바이스를 개발한다. 또 영상처리를 통해 횡단보도에서 보행자 신호등을 분석하여 빨간불과 초록 불을 알려줄 수 있도록 한다. 최종적으로 시각장애인들에게 보행 시 불편함을 덜어주고 안전을 지킬 수 있도록 한다. 

2️⃣ **배경 설명**

![image](https://user-images.githubusercontent.com/36808530/121846342-da98e480-cd21-11eb-8d41-d9974fe045fc.png)


3️⃣ **개발 동기**

길 찾기 시, 사용하는 내비게이션을 시각장애인들도 이용할 수 있으면 편리할 것 같다는 생각을 했고, 시각장애인들이 안전하게 도보를 보행하기 위해서는 큰 노력이 필요하다고 느꼈다. 그래서 기존의 내비게이션 API와 ICT 기술을 이용한 딥러닝 기반의 학습을 통해 시각장애인의 길을 안내하다 보면 보다 안전하고, 시각장애인의 보행 훈련에 대한 어려움을 덜어주고자 한다. 

4️⃣ **필요성**

수많은 시각장애인은 가고자 하는 목적지 길 찾기에 어려움이 있으며 보행 시, 사물 인식 등의 어려움이 있어 사회적 소외를 겪을 수 있다고 생각했다. 또 보행 시, 항상 긴장하면서 보행해야 하는 심리적 불안감을 지닐 수 있다고 판단하였다. 



## 2. 구성도

![image](https://user-images.githubusercontent.com/36808530/121846388-ea182d80-cd21-11eb-89f4-53febf034c5a.png)

![image](https://user-images.githubusercontent.com/36808530/121846382-e84e6a00-cd21-11eb-8ad7-3e6959530487.png)

## 3. 개발 내용

1. 신호등 녹색불, 빨간불 감지</br>
  (1) 신호등 이미지 yolo-mark로 라벨링</br>
   	yolo-mark의 obj.data, obj.names 파일에서 학습할 이미지의 폴더와 클래스 수, 라벨링 할 이름을 설정</br>
    ![image](https://user-images.githubusercontent.com/36808530/121847409-7f67f180-cd23-11eb-8ac3-41bd9fa3c406.png)</br>
  (2) 프로그램 실행하여 녹색불 300장, 빨간불 300장 라벨링</br>
    ![image](https://user-images.githubusercontent.com/36808530/121847490-9b6b9300-cd23-11eb-8771-7e7c4ef5f1b1.png)</br>


2. darknet 프레임워크를 이용해서 학습</br>
  (1) darknet 폴더의 yolov3.cfg 파일 수정</br>
    ![image](https://user-images.githubusercontent.com/36808530/121847520-a9b9af00-cd23-11eb-88d2-8b2055da63c2.png)</br>   
   GTX 1060의 환경에서 학습 진행 시 out of memory 에러가 발생해서 batch 크기를 32로 줄이고 입력되는 이미지의 크기를 416으로 줄여서 해결하였다.</br>
    ![image](https://user-images.githubusercontent.com/36808530/121847537-b2aa8080-cd23-11eb-8866-b99f806fc28a.png)</br>
   녹색불, 빨간불 2개의 클래스를 인식하는 것이므로 detection layer의 classes의 개수를 2개로 수정하였다.

  (2) 다음 명령어로 학습 시작</br>
![image](https://user-images.githubusercontent.com/36808530/121847573-be964280-cd23-11eb-8093-f60ce2f0f73c.png)

  (3) 소켓 통신을 이용해서 라즈베리파이에서 카메라 이미지를 캡처해서 서버로 보냄</br>
     (3-1) 서버 컴퓨터 고정 ip 할당</br>
    ![image](https://user-images.githubusercontent.com/36808530/121847755-09b05580-cd24-11eb-9dfa-7d771325a750.png)</br>
     (3-2) 외부 ip에서 접속하기 위해 포트포워딩 </br>
    ![image](https://user-images.githubusercontent.com/36808530/121847759-0c12af80-cd24-11eb-8969-81710b326367.png)

3. 라즈베리파이와 서버의 소켓 통신
  (1) 라즈베리파이 - client.py

   ```python
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
   ```

   라즈베리파이에서 카메라를 이용해 캡처하고 그 이미지를 6112포트로 서버로 전송한다.
   이미지 전송을 완료하면 소켓2를 서버와 연결해서 서버로부터 분석된 내용을 6113포트로 수신받고 "red", "blue", "none"을 반환한다.

   (2) 서버 - server.py

   ```python
   import SocketServer
   from os.path import exists
   import time
    
   HOST = ''
   PORT = 6112
    
   class MyTcpHandler(SocketServer.BaseRequestHandler):
       def handle(self):
   	data_transferred = 0
   	print('[%s] ' %self.client_address[0])
   	filename = 'image.jpg'
           data = self.request.recv(1024)
   	
           with open('download/' + filename, 'wb') as f:
               try:
                   while  data:
                       f.write(data)
                       data_transferred += len(data)
                       data = self.request.recv(1024)
   	    except Exception as e:
                   print(e)
    	with open('flag.txt', 'wt') as f:       
               f.write('1')
   
   	self.request.sendall('1'.encode())
    	
   
   def runServer():
       print('server')
       print("server")
    
       try:
           server = SocketServer.TCPServer((HOST,PORT),MyTcpHandler)
         	server.serve_forever()
       except KeyboardInterrupt:
           print('')
    
    
   runServer()
   
   ```

   라즈베리파이로부터 이미지를 수신하고 파일로 저장한다.

4. darknet의 소스코드를 수정하여 라즈베리파이의 이미지가 서버로 수신되면 분석하고 분석 내용을 라즈베리파이로 보내도록 함
   (1) /darknet/src/image.c

   ​	draw_detections 함수 호출 시 정확도가 가장 높은 객체를 숫자 1 또는 2로 반환

    ```c
   char draw_detections(image im, detection *dets, int num, float thresh, char **names, image **alphabet, int classes)
   {
       int i,j;
   //coding
       int max=0;
       int max_index=-1;
   
   //end coding
       for(i = 0; i < num; ++i){
           char labelstr[4096] = {0};
           int class = -1;
           for(j = 0; j < classes; ++j){
               if (dets[i].prob[j] > thresh){
                   if (class < 0) {
                       strcat(labelstr, names[j]);
                       class = j;
                   } else {
                       strcat(labelstr, ", ");
                       strcat(labelstr, names[j]);
                   }
   		if(max < dets[i].prob[j]*100){
   			max = dets[i].prob[j]*100;	
   			max_index = j;
   		}	
                   printf("%s: %.0f%%\n", names[j], dets[i].prob[j]*100);
               }
           }
           if(class >= 0){
               int width = im.h * .006;
   
               /*
                  if(0){
                  width = pow(prob, 1./2.)*10+1;
                  alphabet = 0;
                  }
                */
   
               //printf("%d %s: %.0f%%\n", i, names[class], prob*100);
               int offset = class*123457 % classes;
               float red = get_color(2,offset,classes);
               float green = get_color(1,offset,classes);
               float blue = get_color(0,offset,classes);
               float rgb[3];
   
               //width = prob*20+2;
   
               rgb[0] = red;
               rgb[1] = green;
               rgb[2] = blue;
               box b = dets[i].bbox;
               //printf("%f %f %f %f\n", b.x, b.y, b.w, b.h);
   
               int left  = (b.x-b.w/2.)*im.w;
               int right = (b.x+b.w/2.)*im.w;
               int top   = (b.y-b.h/2.)*im.h;
               int bot   = (b.y+b.h/2.)*im.h;
   
               if(left < 0) left = 0;
               if(right > im.w-1) right = im.w-1;
               if(top < 0) top = 0;
               if(bot > im.h-1) bot = im.h-1;
   
               draw_box_width(im, left, top, right, bot, width, red, green, blue);
               if (alphabet) {
                   image label = get_label(alphabet, labelstr, (im.h*.03));
                   draw_label(im, top + width, left, label, rgb);
                   free_image(label);
   
   	    }
               if (dets[i].mask){
                   image mask = float_to_image(14, 14, 1, dets[i].mask);
                   image resized_mask = resize_image(mask, b.w*im.w, b.h*im.h);
                   image tmask = threshold_image(resized_mask, .5);
                   embed_image(tmask, im, left, top);
                   free_image(mask);
                   free_image(resized_mask);
                   free_image(tmask);
               }
           }
       }
   //coding
   	if(max_index != -1){
   		if(!strcmp(names[max_index], "red")){
   			return '1';
   		}
   		else if(!strcmp(names[max_index], "blue")){
   			return '2';			
   		}
   	}
   	return '0';
   //end coding        
   }
    ```

   (2) /darknet/examples/detector.c

   ```c
   void test_detector(char *datacfg, char *cfgfile, char *weightfile, char *filename, float thresh, float hier_thresh, char *outfile, int fullscreen)
   {
       list *options = read_data_cfg(datacfg);
       char *name_list = option_find_str(options, "names", "data/names.list");
       char **names = get_labels(name_list);
   
       image **alphabet = load_alphabet();
       network *net = load_network(cfgfile, weightfile, 0);
       set_batch_network(net, 1);
       srand(2222222);
       double time;
       char buff[256];
       char *input = buff;
       float nms=.45;
   
   // 소켓
   
       char buffer[BUF_LEN];
       struct sockaddr_in server_addr, client_addr;
       char temp[20];
       int server_fd, client_fd;
       //server_fd, client_fd : 각 소켓 번호
       int len, msg_size;
       char light;
       char recv_data;
       if((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == -1)
       {// 소켓 생성
           printf("Server : Can't open stream socket\n");
           exit(0);
       }
       memset(&server_addr, 0x00, sizeof(server_addr));
       //server_Addr 을 NULL로 초기화
    
       server_addr.sin_family = AF_INET;
       server_addr.sin_addr.s_addr = htonl(INADDR_ANY);
       server_addr.sin_port = htons(6113);
       //server_addr 셋팅
    
       if(bind(server_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) <0)
       {//bind() 호출
           printf("Server : Can't bind local address.\n");
           exit(0);
       }
    
       if(listen(server_fd, 5) < 0)
       {//소켓을 수동 대기모드로 설정
           printf("Server : Can't listening connect.\n");
           exit(0);
       }
    
       memset(buffer, 0x00, sizeof(buffer));
       printf("Server : wating connection request.\n");
       len = sizeof(client_addr);
   
   
       while(1){
   
           client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &len);
           if(client_fd < 0)
           {
               printf("Server: accept failed.\n");
               exit(0);
           }
           inet_ntop(AF_INET, &client_addr.sin_addr.s_addr, temp, sizeof(temp));
           printf("Server : %s client connected.\n", temp);
   	
   	
   //소켓 끝
   //coding
       while(1){
   		strncpy(input, "/home/jihoon/server/download/image.jpg", 256);
   //end coding
           image im = load_image_color(input,0,0);
           image sized = letterbox_image(im, net->w, net->h);
           //image sized = resize_image(im, net->w, net->h);
           //image sized2 = resize_max(im, net->w);
           //image sized = crop_image(sized2, -((net->w - sized2.w)/2), -((net->h - sized2.h)/2), net->w, net->h);
           //resize_network(net, sized.w, sized.h);
           layer l = net->layers[net->n-1];
   
   
           float *X = sized.data;
           time=what_time_is_it_now();
           network_predict(net, X);
           printf("%s: Predicted in %f seconds.\n", input, what_time_is_it_now()-time);
           int nboxes = 0;
           detection *dets = get_network_boxes(net, im.w, im.h, thresh, hier_thresh, 0, 1, &nboxes);
           //printf("%d\n", nboxes);
           //if (nms) do_nms_obj(boxes, probs, l.w*l.h*l.n, l.classes, nms);
           if (nms) do_nms_sort(dets, nboxes, l.classes, nms);
           light = draw_detections(im, dets, nboxes, thresh, names, alphabet, l.classes);
   	//draw_detections(im, dets, nboxes, thresh, names, alphabet, l.classes);
   //coding
           send(client_fd, &light, 1, 0);
           close(client_fd);
           printf("Server : %s client closed.\n", temp);
   	
   //end coding
          	free_detections(dets, nboxes);
           free_image(im);
           free_image(sized);
           if (filename) break;
   	}
       }
   close(server_fd);
   
   }
   ```

   test_detector 함수에서 소켓을 생성하고 라즈베리파이에서 서버로 이미지가 전송 완료되면 draw_detections()를 통해 분석 결과를 반환하고 라즈베리파이로 결과를 전송한다.

5. 라즈베리파이에서 분석 내용을 받고 "녹색불입니다" or "빨간불입니다" 녹음 파일 재생
   client.py

   ```python
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
   
   ```



## 4. 결론

![image](https://user-images.githubusercontent.com/36808530/121849448-4c732d00-cd26-11eb-86db-b2387db6d5f7.png)

<video src="./README/결과영상.mp4"></video>

1️⃣ **결과 분석**
  - 디바이스에서 핫 워드를 인식하고 STT를 이용해서 음성 명령을 처리할 수 있다.
  - 목적지와 현재 좌표를 AWS에 전송하면 카카오 API를 통해 현재 위치에서 반경 10km 내에 있는 목적지의 좌표를 가져와 처리되는 유연성을 지니고 있다.
  - Tmap API와 Kakao API를 통해 목적지까지 도보 길 정보를 아마존 폴리(TTS)를 이용해 디바이스에 전송할 수 있다.
  - 웨어러블 장치에서 객체 감지 결과를 받아 신호등 판별 및 감지 가능.

2️⃣ **기대효과**
  - 시각장애인들의 도보 시, 사고 발생률 저하로 인한 안전성을 제공한다.
  - 안전한 도로 정보를 제공함으로써 항상 긴장하면서 보행해야 하는 시각장애인에게 심리적 안정감 부여.
  - 사회적 인식 개선: 시각장애인은 보이지 않는다는 사회적인 편견을 개선 시킨다. 
  - 시각장애인들의 길 찾기 정보를 쉽게 습득할 수 있게 해줘 편의성이 증대된다. 
  - 보행훈련 제공: 시각장애인들에게 보행훈련을 지원한다. 
  - 생활 반경 확장 가능: 제한적이었던 외출 환경을 개선하여 편리하고 더욱 주체적인 길 안내 도구를 제공한다.

3️⃣ **향후 개선 과제**
  - T-map 도보 안내의 특정 좌표에서 작동하지 않는 문제 개선 필요. 
    (Ex. 실내공간) 간헐적 좌표 튕김 현상과 관련한 GPS 정확도 개선 필요.
  - 음성 명령의 부정확성으로 스마트폰과 연동하여 목적지에 대해 키 입력을 받을 필요성이 있음.
  - 클라우드의 계산속도와 전송속도의 차이 줄이는 개선 필요.
  - 여러 사람이 사용해도 동작할 수 있게 구조 변경 필요. 
