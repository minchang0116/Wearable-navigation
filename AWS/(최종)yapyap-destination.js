console.log('Loading function');
const AWS = require('aws-sdk'); // aws 모듈
var https = require('https'); // https 모듈 
const docClient = new AWS.DynamoDB.DocumentClient({region: 'ap-northeast-2'});
//var appKey = '0d686af8-7f32-4fab-9b79-4994ae5d166b'; // tmap API
var appKey = '0ee08c22-43eb-49a9-b3dc-f532c079929c';
var appKey2='KakaoAK 51bed9b090989a4f646ae8c46bd6856e'; // Kakao API

var curX='';
var curY='';
var dest='';

var destLat=''; // API 호출 후 얻게 될 목저지의 좌표
var destLon=''; // 

var destination='';

function Geocoding(){

    var params={
        TableName : 'yapyap-destination'
    };
    docClient.scan(params, function(err, data){
        if(err){
            console.log('yapyap-destination 테이블 스캔 오류');
        }
        else{
            curX = data.Items[0].destX;
            curY = data.Items[0].destY;
            dest = data.Items[0].Destination;

            destination=encodeURIComponent(dest); // URL 형태로 목적지 이름을 인코딩 한다.

            console.log('curX : '+curX);
            console.log('curY : '+curY);

            // 목적지 좌표 얻어오기
            var options={
                host : 'dapi.kakao.com',
                path : '/v2/local/search/keyword.json?y='+curY+'&x='+curX+'&radius=20000&query='+destination,
                headers :{'Authorization': appKey2}
            };
            console.log('Geocoding on progress');

            // Kakao API 호출하는 과정
            var getReq=https.request(options, function(res){
                console.log('status code: ', res.statusCode);
                var store="";
                res.on('data', function(data){ // 데이터가 한개가 아니기 때문에 모든 데이터를 저장해준다.
                    store+=data;
                });
                res.on('end', function(){ // 데이터를 모두 받았다면, 
                   var extractedData=JSON.parse(store); // JSON 형태로 변환
                   //console.log(extractedData);
                   destLat=extractedData.documents[0].y; // 목적지의 Y 좌표
                   destLon=extractedData.documents[0].x; // 목적지의 X 좌표 
                   console.log('lat : '+destLat);
                   console.log('lon : '+destLon);

                   Update_Table(dest, destLat, destLon, Total); // yapyap-destination의 값을 변경해야 한다. destination을 넘겨주면 안된다. 인코딩 된 값이랑 이상한 값이야. 그래서 dest 넘겨준다.
                });
            });

            getReq.end();
            getReq.on('error', function(err){
                console.log("Error: ", err);
            });
        }  
    });
}

// yapyap-destination 테이블 업데이트
function Update_Table(destination, destLat, destLon, callback){
    var params_destination={
        Item:{
            NUMBER : "1",
            Destination : destination, // 목적지 이름
            destX : destLon, 
            destY : destLat
        },
        TableName: 'yapyap-destination'
    };
    docClient.put(params_destination, function(err,data){
    if(err){
        console.log('error occured in putItem');
    }else{
        console.log('yapyap-destination 테이블로 업데이트 완료');
        callback();
    }
    });
}

var Total = function(){
    var destinationURL=destination;
    var startX=curX;
    var startY=curY;
    var endX=destLon;
    var endY=destLat;
    
    var options = {
       host: 'dapi.kakao.com',
       path : '/v2/local/geo/coord2address.json?x='+startX+'&y='+startY+'&input_coord=WGS84',
       headers :{'Authorization': appKey2}
    };
    
    var store="";        
    var getReq=https.request(options, function(res){
        console.log('kakao status code: ', res.statusCode);
        
        res.on('data', function(data){
            store+=data;
        });
        
        res.on('end', function(){
            var extractedData=JSON.parse(store);
            var startPosition=extractedData.documents[0].address.address_name;
            console.log('현재 위치 : '+startPosition);

            var startPositionURL=encodeURIComponent(startPosition);
            
            // tmap api 호출.
            options = {
                host: 'api2.sktelecom.com',
                path : '/tmap/routes/pedestrian?version=1&format=json&startX='+startX+'&startY='+startY+'&endX='+endX+'&endY='+endY+'&reqCoordType=WGS84GEO&resCoordType=EPSG3857&startName='+startPositionURL+'&endName='+destinationURL+'&searchOption=0&appKey='+appKey
            };

            var getReq = https.request(options, function(res){
                console.log("yapyap-total res.statusCode : ", res.statusCode);
                
                res.on('data', function(data){
                    var obj = JSON.parse(data);

                    if(obj.features[0].properties.pointType == 'SP'){
                        var totalDistance = obj.features[0].properties.totalDistance;
                        var totalTime = parseInt(obj.features[0].properties.totalTime/60);
                    }

                    var params = {
                        Item: {
                            NUMBER : "1",
                            totalDistance : totalDistance,
                            totalTime : totalTime
                        },
                        TableName : 'yapyap-total'
                    };
                    docClient.put(params, function(err, data){
                        if(err){
                            console.log('yapyap-total 테이블 업데이트 실패');
                        }else{
                            console.log('yapyap-total 테이블 업데이트 완료');
                        }
                    });
                });

            });
            getReq.end();
            getReq.on('error', function(err){
                console.log("Error: ", err);
            });

        });
    });
    
    getReq.end();
    getReq.on('error', function(err){
        console.log("Error: ", err);
    });
};

exports.handler = function (event, context, callback)  {
    Geocoding();
};

