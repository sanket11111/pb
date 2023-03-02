// const axios = require('axios')
const { ObjectId } = require('mongodb');
const moment = require('moment');
const YamlParser = require('serverless/classes/YamlParser');
const Course = require('./course');
// getUserData = async () => {
//     // const idToken = event.headers.Authorization;
//     const idToken = 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImQwNTU5YzU5MDgzZDc3YWI2NDUxOThiNTIxZmM4ZmVmZmVlZmJkNjIiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoidXNlcjQ1NiIsImNzdF91aWQiOiIxMDQ1NiIsImNzdF9wYXJ0bmVyX2lkIjoxMDAwMSwiY3N0X3NmIjo4LCJjc3RfYXV0aF90eXBlIjoibG9naW4iLCJjc3RfZF9pZCI6Ijg3NDI0N3AxNjc0NTU3MjcyODQ1IiwiY3N0X3VuYW1lIjoidXNlcjQ1NiIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9wb2tlcmJhYXppLXFhIiwiYXVkIjoicG9rZXJiYWF6aS1xYSIsImF1dGhfdGltZSI6MTY3NDU1NzI3NSwidXNlcl9pZCI6IjEwNDU2Iiwic3ViIjoiMTA0NTYiLCJpYXQiOjE2NzQ1NjQxNDcsImV4cCI6MTY3NDU2Nzc0NywiZW1haWwiOiJ1c2VyNDU2QHFhdXNlci5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfbnVtYmVyIjoiKzkxMTA0NTYyMzU5NyIsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsicGhvbmUiOlsiKzkxMTA0NTYyMzU5NyJdLCJlbWFpbCI6WyJ1c2VyNDU2QHFhdXNlci5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJjdXN0b20ifX0.YneCC6ROO5-1sc53l4Eh0dLl_wo_0zGeCr7FbzVjogBes_t5Q8q_02BcsYlws7xwJEfLwTAuUATMj81SzwqE29VvF7Jgw5hqCdi4WNz6-eJlnIvJOJ0So_XwzNNwNlXDE3uGZIw02hdxSGPuPlswhEC64-XYRqdREbvvbqqNd9Z176-xuaxteU7UcmGAUvuf2NYN-KaOG4tlUu30X52-Yy0aGMJqHc8xe9vHMMJhQP-VP9UnJK0TDPDwtu9Jwz7hobTBteQkNM8HFNmXLd7hEK_PngVk0PKzwubwTTbW6TtjT3QG0mmVxh4akB0p2H9vuIA_18RPFlJmUFAPSXUeMQ'
//     const url = `https://nxtgenapiqa.alphabetabox.com/msc/user/profile`;
//     // const url = getSecretFun.getSecrets('UserdataEndpoint');
//     console.log("hii")
//     return await axios.get(url, {
//       headers: { Authorization: idToken },
//       params: { info_params: `['login_info']` }
//     }).then((response) => {
//       console.log("response", response.data.response)
//       return response.data.response;
//     })
// }
// getUserData()
// let a = [ 
//   ObjectId("616e73a7b15396218b892171")
// ]
// const a = moment.duration(1674265424397)
// const a =moment().diff(Date.now(), 1674265424397+(2*604800000)),
// b= moment(1674265424397+(2*604800000)),
// c = moment(Date.now()),
// d = b.diff(c, 'seconds')

// var measuredTime = new Date(null);
// measuredTime.setSeconds(d); // specify value of SECONDS
// var MHSTime = measuredTime.toISOString().substr(11, 8);
// // const a = moment().diff(1674265424397 , Date.now())
// console.log("asd", MHSTime )



//--------------------------------------------------------------------------------------------------------------------//

isanylastseenvideo
    -YES 
        -isitcomplete
            -NO
                -show the same Video
            -YES 
                -is it the last video of the Course
                    - NO
                        -show the next video of the Course 
                    -YES 
                        -show the feeds
    -NO 
        -show feeds
