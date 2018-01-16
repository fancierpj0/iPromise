let Promise = require('./Promise');
/**
 * 基本使用
 */
// let p = new Promise((resolve,reject)=>{
//   // resolve('resolve');
//   reject('reject');
// });
//
// p.then((value)=>{
//   console.log('fulfilled:',value);
// },(reason)=>{
//   console.log('rejected:',reason);
// });

/**
 * 同步resolve/reject和异步resolve/reject 统一调为异步
 */
// let p = new Promise((resolve,reject)=>{
//   resolve('resolve');
//   // setTimeout(()=>{
//   //   resolve('resolve');
//   //   // reject('reject');
//   // })
// });
// p.then((value)=>{
//   console.log('fulfilled:',value);
// },(reason)=>{
//   console.log('rejected:',reason);
// });
// console.log('----------------');

/**
 * 值的穿透
 */
// let p = new Promise((resolve,reject)=>{
//   resolve('resolve');
// });
// p.then().then((value)=>{
//   console.log(value);
// });
// console.log('----------------');

/**
 * 当then绑定的回调函数return的是一个promise，且这个promise resolve或则reject也是一个promise
 */
// let p = new Promise((resolve,reject)=>{
//   resolve('resolve1');
// });
// p.then((value)=>{
//   return new Promise((resolve,reject)=>{
//     resolve(new Promise((resolve,reject)=>{
//       setTimeout(()=>{
//         resolve('嘻嘻')
//       });
//     }));
//   });
// }).then((value)=>{
//   console.log(value); //嘻嘻
// });
// console.log('----------------');

/**
 * executor中的resolve()里是一个promise
 */
// let p =  new Promise((resolve,reject)=>{
//   resolve(new Promise((resolve,reject)=>{
//     setTimeout(()=>{
//       resolve('嘿哈')
//     });
//   }));
// });
//
// p.then((value)=>{
//   console.log(value);
// });
// console.log('----------------');

/**
 * resolve方法
 */
let p = Promise.resolve('嘿哈!');
console.log('---------');
p.then((value)=>{
  // console.log('fulfilled:',value);
  return value; //执行到此时解析return 来resolve/reject promise2
},(reason)=>{
  console.log('rejected:',reason);
}).then((value)=>{ //只有状态改变时才会调用 //new 返回的promise是同步的
  console.log(value);
});