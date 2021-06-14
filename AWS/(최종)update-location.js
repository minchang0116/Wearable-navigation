const AWS = require('aws-sdk'); // aws 모듈
const docClient = new AWS.DynamoDB.DocumentClient({region: 'ap-northeast-2'}); // dynamoDB 접근 위한 설정
var https = require('https'); // https 모듈
//var appKey = '0d686af8-7f32-4fab-9b79-4994ae5d166b'; // TMAP 
var appKey = '0ee08c22-43eb-49a9-b3dc-f532c079929c';
var appKey2='KakaoAK 51bed9b090989a4f646ae8c46bd6856e'; // 카카오 REST API

var startX = ''; // 시작 좌표
var startY = '';

var distance = ''; // 다음 포인트까지의 거리
var destX = ''; // 목적지의 좌표
var destY = '';
var turnType =''; // 다음 포인트에서의 회전 방향
var facilityType='';
var turn=''; // 

var totalDistance=''; // 전체 남은 거리
var destination =''; // 목적지 이름
var destinationURL=''; // 목적지 이름 URL 변환 결과
var startPosition = ''; // 시작 위치
var startPositionURL=''; // 시작 위치 URL 인코딩 결과
var options;


function getTimeStamp() {
    var d = new Date();
    var s = 
    leadingZeros(d.getFullYear(), 4) + '-' +
    leadingZeros(d.getMonth() + 1, 2) + '-' +
    leadingZeros(d.getDate(), 2) + ' ' +

    leadingZeros(d.getHours(), 2) + ':' +
    leadingZeros(d.getMinutes(), 2) + ':' +
    leadingZeros(d.getSeconds(), 2);
    return s;
}

function leadingZeros(n, digits) {
    var zero = '';
    n = n.toString();
    var i;
    if (n.length < digits) {
        for (i = 0; i < digits - n.length; i++)
            zero += '0';
    }
    return zero + n;
}

var Update_Total = function(totalDistance, totalTime)
{
        
    var params = {
        Item: {
            NUMBER : "1",
            totalDistance : totalDistance,
            totalTime : totalTime
        },
        TableName : 'yapyap-total'
    };
    console.log('totalDistance : '+totalDistance);
    docClient.put(params, function(err, data){
        if(err){
            console.log('yapyap-total 업데이트 실패');
        }else{
            console.log('yapyap-total 테이블 업데이트 성공');
        }
    });
};

// yapyap-destination 테이블에서 목적지, destX, destY 정보 가져오기
var GetDestinationInfo = function(callback){
    var params = {
        TableName : 'yapyap-destination'
    };
    docClient.scan(params, function(err, data){
        if(err){
            callback(err, null);
        }else{
            destination=data.Items[0].Destination;
            destX=data.Items[0].destX;
            destY=data.Items[0].destY;
            
            console.log('yapyap-destination 테이블에서 가져온 값');
            console.log('destination : '+destination);
            console.log('destX : '+destX);
            console.log('destY : '+destY);
            
            // 테이블 접근
            //GetApi(AccessTable);
            //Point2Name(GetApi);
            callback(Point2Name);
        }
    });
};

var AccessTable = function(distance, turnType){
    console.log('AccessTable');
    var DateTimePrev = getTimeStamp();
    
    var distanceNumber = Number(distance);
    
    var params = {
        Item: {
            DateTime: DateTimePrev,
            destination: destination,
            distance: distanceNumber,
            turnType: turn
        },
        TableName: 'yapyap-navi'
    };
    
    docClient.put(params, function(err, data){
        if(err){
            console.log('yapyap-navi table update failed');
        }
        else{
            
            console.log('yapyap-navi 테이블로 업데이트 COMPLETE');
            var params_last_distance={
                Item:{
                    NUMBER : "1",
                    Destination: destination,
                    DateTime: DateTimePrev,
                    totalDistance: totalDistance,
                    distance: distanceNumber,
                    turnType: turn
                },
                TableName: 'yapyap-last-distance'
            };
            docClient.put(params_last_distance, function(err,data){
                if(err){
                }else{
                    console.log('yapyap-last-distance 테이블로 업데이트 완료');
                }
            });
        }
    });
};


// yapyap-update-location 에서 현재 위치의 좌표값을 가져와서 계속 업데이트
// 여기서 yapyap-update-location 테이블에서 쓰는 이름은 솔직히 필요 없어.
// 어차피 destination은 yapyap-destination에서 가져오기 때문에
var Point2Name = function(callback)
{
    let scanningParameters = {
        TableName: 'yapyap-update-location',
        Limit: 1
    };
    
    // yapyap-update-location 테이블에서 현재 위치 가져오기
    docClient.scan(scanningParameters, function(err, data){
        if(err){
            callback(err, null);
        }else{
            // 현재 좌표 가져온다.
            //console.log(data.Items[0]);
            startX = data.Items[0].startX;
            startY = data.Items[0].startY;
            // scan 결과 값 : 현재 X,Y 좌표
            console.log("scan", startY);
            console.log("scan", startX);
            
            options = {
                host: 'dapi.kakao.com',
                // 현재 좌표를 적어야되
                path : '/v2/local/geo/coord2address.json?x='+startX+'&y='+startY+'&input_coord=WGS84',
                headers :{'Authorization': appKey2}
            };
            
            var store="";
            var getReq=https.request(options, function(res){
                console.log('status code: ', res.statusCode);
                res.on('data', function(data){
                    store+=data;
                });
                res.on('end', function(){
                    // kakao api로 좌표로 가져온 주소 저장.
                    //console.log('all data : '+store);
                    var extractedData=JSON.parse(store);
                    startPosition=extractedData.documents[0].address.address_name;
                    console.log('현재 위치 : '+startPosition);
                    
                    // 목적지 이름 utf-8 url 인코딩
                    destinationURL=encodeURIComponent(destination);
                    //console.log('destination : '+destination);
                          
                    startPositionURL=encodeURIComponent(startPosition);
                    //console.log('startPosition : '+startPosition);
                    
                    callback(GetApi);
                });
            });
            
            getReq.end();
            getReq.on('error', function(err){
                console.log("Error: ", err);
            });
            
        }
    });
};

var GetApi = function (callback){
    
    // 현재 시작위치, 도착 위치 제대로 테이블에서 가져왔나 확인
    //console.log('startX : '+startX);
    //console.log('startY : '+startY);
    //console.log('destX : '+destX);
    //console.log('destY : '+destY);
    //console.log('startPosition : '+startPositionURL);
    //console.log('destination : '+destinationURL);
      
    // tmap api 호출.
    options = {
        host: 'api2.sktelecom.com',
        path : '/tmap/routes/pedestrian?version=1&format=json&startX='+startX+'&startY='+startY+'&endX='+destX+'&endY='+destY+'&reqCoordType=WGS84GEO&resCoordType=EPSG3857&startName='+startPositionURL+'&endName='+destinationURL+'&searchOption=0&appKey='+appKey
    };
    // request 요청 보내기
    var getReq = https.request(options, function(res){
        console.log("res.statusCode : ", res.statusCode); // 요청 성공 시 200 반환, 실패 시 400
        res.on('data', function(data){ // response에 대해서
            var ojb = JSON.parse(data); // response data를 json 형태로 변환  
            //console.log(ojb);
            //console.log(ojb.features[1]);
            //console.log(ojb.features[2]);
            //console.log(ojb.features[3]);
            
            totalDistance=ojb.features[0].properties.totalDistance;
            if(ojb.features[0].properties.pointType!=''){
                var totalTime=parseInt(ojb.features[0].properties.totalTime / 60);
                
                Update_Total(totalDistance, totalTime);
            }
            
            
            distance = ojb.features[1].properties.distance;
            turnType = ojb.features[2].properties.turnType;
            
            if(ojb.features[2].properties.facilityName!='')
                facilityType=ojb.features[2].properties.facilityName;
            
            //console.log(ojb);
            console.log('===TurnType : ', turnType);
            console.log('===facilityName : ', facilityType);
            
            switch(turnType){
                case 11:
                    turn = '직진 ';
                    break;
                case 12:
                    turn = '좌회전 ';
                    break;
                case 13:
                    turn = '우회전 ';
                    break;
                case 14:
                    turn = '유턴 ';
                    break;
                case 16:
                    turn = '8시 방향 좌회전 ';
                    break;
                case 17:
                    turn = '10시 방향 좌회전 ';
                    break;
                case 18:
                    turn = '2시 방향 우회전 ';
                    break;
                case 19:
                    turn = '4시 방향 우회전 ';
                    break;
                    // 184 : 경유지
                    // 185 : 첫 번쨰 경유지
                    // 186 : 두 번째 경유지
                    // . . . . . 
                    // 189 : 다섯번째 경유지
                    // 
                case 125:
                    turn= '육교';
                    break;
                case 126:
                    turn = '지하보도';
                    break;
                case 127:
                    turn = '계단 진입';
                    break;
                case 128:
                    turn = '경사로 진입';
                    break;
                case 129:
                    turn = '계단과 경사로 진입';
                    break;
                case 200:
                    turn = '출발지';
                    break;
                case 201:
                    turn = '목적지';
                    break;
                case 211:
                    turn = '횡단보도';
                    break;
                case 212:
                    turn = '좌측 횡단보도';
                    break;
                case 213:
                    turn = '우측 횡단보도';
                    break;
                case 214:
                    turn = '8시 방향 횡단보도';
                    break;
                case 215:
                    turn = '10시 방향 횡단보도';
                    break;
                case 216:
                    turn = '2시 방향 횡단보도';
                    break;
                case 217:
                    turn = '4시 방향 횡단보도';
                    break;
                case 218:
                    turn = '엘리베이터';
                    break;
                case 233:
                    turn = '직진 임시';
                    break;
                    
                default:
                    turn = '';
            }
            
            console.log("turnType",turn);
            console.log("distance",distance);
            
            callback(distance, turnType); // AccessTable 호출 시 필요한 인자 전달.
        });
        
    });
    
    getReq.end();
    getReq.on('error', function(err){
        console.log("Error: ", err);
    });
};




exports.handler = function(event, context, callback) {
  //read table
  //GetApi(AccessTable);
      GetDestinationInfo(function(res_point2name){ // GetDestinationInfo 함수를 실행, callback으로 Point2Name 받는다.
          res_point2name(function(res_getapi){ // Point2Name 함수 실행, callback으로 GetApi 받는다.
              res_getapi(function(distance, turntype){ // GetApi 함수 실행, callback으로 AccessTable 받는다.
                  AccessTable(distance, turntype); // AccessTable 함수 실행. 여기는 그냥 함수 실행만
              });
          });
      });

};