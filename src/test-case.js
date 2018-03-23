let Promise = require('./Promise.js');

// //1) basic基础功能检测
// let p = new Promise(function(resolve,reject){
//   reject('成功');
//   resolve('失败');
// });
// p.then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// });

//2) executor中throw error则reject it
// let p = new Promise(function(resolve,reject){
//   throw new Error('发生错误')
// });
// p.then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// });

//3) 支持 asynchronous
// let p = new Promise(function(resolve,reject){
//   setTimeout(function(){
//     reject('成功');
//     resolve('失败');
//   },1000)
// });
// p.then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// });
// p.then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// });

//4) 支持 链式调用
// then 返回的是一个新的promise对象
// new Promise(function(resolve,reject){
//   setTimeout(function(){
//     reject('成功');
//     resolve('失败');
//   },1000)
// }).then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// }).then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// });


//5) return
// 如果promise.then有返回值，无论是成功的回调还是失败的回调，只要有返回值（没有异常抛出）就会走下一个then中的成功回调，并且这个值将会作为下一次then中回调的参数传入

// then中的callback中throw error则reject it，且下一次会走失败的回调，并接受throw的err作为参数传入。

// 如果return的是promise会等待promise有结果以后依据promise最终的状态来决定进入then中的哪个回调，并将结果值作为参数传递给这个回到

// 如果return的是promise---a且这个promise的resolve也是一个promise---b，那么最终返回的是promise---b的结果

// new Promise(function(resolve,reject){
//   setTimeout(function(){
//     reject('成功');
//     resolve('失败');
//   },1000)
// }).then(function(data){
//   console.log(data);
//   return 'ahhh1';
// },function(err){
//   console.log(err);
//   throw Error('ahhh2');
// }).then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// });

// 如果then中返回的promise是它本身就reject it
// let p = new Promise(function(resolve,reject){
//   resolve();
// });
// var p2 = p.then(function(){
//   return p2;
// });
// p2.then(function(){
//
// },function(e){
//   console.log(e);
// });

//6)resolve
let p = new Promise(function(resolve,reject){
  resolve(new Promise(function(resolve,reject){
    setTimeout(function(resolve,reject){
      resolve(2000);
    },1000)
  }));
}).then(function(data){console.log(data)});

//7) 支持值的穿透
// var p = new Promise(function(resolve,reject){
//   resolve()
// });
// p.then().then().then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// });

//8) catch
// let p = new Promise(function(resolve,reject){
//   reject('错误');
// });
// p.then(()=>{
//
// }).catch(e=>{
//   console.log(e);
// });


//--- --- --- Promise方法 --- --- ---

// 检测Promise.defer
// function read(){
//   return new Promise(function(resolve,reject){
//     require('fs').readFile('./1.txt','utf8',function(err,data){
//       if(err) return reject(err);
//       resolve(data);
//     });
//   });
// }

// 以下是以上的的语法糖 // = =！一点不语法糖！
// function read(){
//   let defer = Promise.defer();
//   require('fs').readFile('./1.txt','utf8',function(err,data){
//     if(err) return defer.reject(err);
//     defer.resolve(data);
//   });
//   return defer.promise;
// }

// read().then(function(data){
//   console.log(data);
// },function(err){
//   console.log(err);
// });

// Promise.all
// function read(url){
//   return new Promise(function(resolve,reject){
//     require('fs').readFile(url,'utf8',function(err,data){
//       if(err) return reject(err);
//       resolve(data);
//     });
//   });
// }
//
// Promise.all([read(),read(),read()]).then(function(data){
//   console.log(data);
// });

Promise.race([read(''),read()]).then(function(data){
  console.log(data);
});


// --- --- --- other
// function abc(cb){
//   cb();
// }
// let a;
// a = new abc(function(){
//   console.log(a);
// })

// promises-aplus-tests
// npm i -g promises-aplus-tests