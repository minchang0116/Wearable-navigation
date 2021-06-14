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
