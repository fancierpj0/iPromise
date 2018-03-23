function Promise(executor){
  let self = this;
  self.status = 'pending';
  self.value = undefined;
  self.reason = undefined;
  self.onResolvedCallbacks = [];
  self.onRejectedCallbacks = [];

  function resolve(value){
    // value可能是别人的promise
    if(value!==null&&(typeof value==='object'||typeof value==='function')){
      return value.then(resolve,reject);
    }
    if(self.status === 'pending'){
      self.status = 'resolved';
      self.value = value;
      self.onResolvedCallbacks.forEach(function(cb){
        cb();
      });
    }
  }

  function reject(reason){
    if(self.status === 'pending'){
      self.status = 'rejected';
      self.reason = reason;
      self.onRejectedCallbacks.forEach(function(cb){
        cb();
      });
    }
  }

  try{ // 正因为executor执行是同步的，故我们能使用try catch
    executor(resolve,reject);
  }catch(e){
    reject(e);
  }
}

function resolvePromise(p2,x,resolve,reject){
  // 注意：有可能解析的是一个第三方promise

  if(p2 === x){ //防止循环引用
    return reject(new TypeError('Error:循环引用')); //让promise2失败
  }

  let called; // 防止第三方的promise出现可能成功和失败的回调都调用的情况

  if(x!==null||(typeof x === 'object')||typeof x === 'function'){
    // 进来了只能说明可能是promise
    try{
      let then = x.then;
      if(typeof then === 'function'){
        then.call(x,function(y){
          if(called) return; //这里可能交由的是第三方promise来处理，故可能被调用两次
          called = true;
          // p.then(function(){return new Promise(){resolve(new Promise...)}}) return中的promise的resolve又是一个promise，即y又可能是一个promise
          resolvePromise(p2,y,resolve,reject);
        },function(err){
          if(called) return;
          called = true;
          reject(err);
        });
      }else{
        resolve(x); //可能只是组键值对，像这样{then:1}
      }
    }catch(e){
      // Object.define({},'then',{value:function(){throw Error()}})
      if(called) return; // 防止第三方promise失败时 两个回调都执行 导致触发两次reject注册的回调
      called = true;
      reject(e);
    }
  }else{ //说明是个普通值 让p2成功
    resolve(x);
  }
}

Promise.prototype.then = function(onFulfilled,onRejected){
  // 成功和失败默认不传，则让他们穿透直到有传值的then
  onFulfilled = typeof(onFulfilled)==='function'?onFulfilled:function(value){
    return value;
  };
  onRejected = typeof(onRejected)==='function'?onRejected:function(err){
    throw err;
  };

  let self = this
    ,promise2; // 返回的新的promise
  if(self.status === 'resolved'){
    promise2 = new Promise(function(resolve,reject){
      // 因为返回值可能是普通值也可能是一个promise，其次也可能是别人的promise,故我们将它命名为x，
      setTimeout(function(){
        try{
          let x = onFulfilled(self.value);
          resolvePromise(promise2,x,resolve,reject);
        }catch(e) {
          reject(e);
        }
      });
    });
  }
  if(self.status === 'rejected'){
    promise2 = new Promise(function(resolve,reject){
      setTimeout(function(){
        try{
          let x = onRejected(self.reason);
          resolvePromise(promise2,x,resolve,reject);
        }catch (e){
          reject(e);
        }
      })
    });
  }
  if(self.status === 'pending'){
    promise2 = new Promise(function(resolve,reject){
      self.onResolvedCallbacks.push(function(){
        setTimeout(function(){
          try{
            let x = onFulfilled(self.value);
            resolvePromise(promise2,x,resolve,reject);
          }catch(e){
            reject(e);
          }
        })
      });
      self.onRejectedCallbacks.push(function(){
        setTimeout(function(){
          try{
            let x = onRejected(self.reason);
            resolvePromise(promise2,x,resolve,reject);
          }catch (e){
            reject(e);
          }
        });
      });
    });
  }
  return promise2;
};

Promise.defer = Promise.deferred = function(){ //一个语法糖，见测试用例
  let dfd = {};
  dfd.promise = new Promise(function(resolve,reject){
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

Promise.prototype.catch = function(callback){
  return this.then(null,callback);
};

Promise.all = function(promises){
  return new Promise(function(resolve,reject){
    let ret = []
      ,i = 0; // 成功多少次
    function processData(index,y){
      arr[index] = y;
      if(++i === promises.length){
        resolve(ret);
      }
    }
    for(let i=0;i<promises.length;++i){
      promises[i].then(function(y){
        processData(i,y);
      },reject);
    }
  });
};

Promise.race = function(promises){
  return new Promise(function(resolve,reject){
    for(let i=0;i<promises.length;++i){
      promises[i].then(resolve,reject);
    }
  });
};

Promise.resolve = function(value){
  return new Promise(function(resolve,reject){
    resolve(value);
  });
};

Promise.reject = function(reason){
  return new Promise(function(resolve,reject){
    reject(reason);
  });
};

Promise.promisify = function(fn){
  return function(...args){
    return new Promise(function(resolve,reject){
      fn(...args,function(err,data){
        if(err)return reject(err);
        resolve(data);
      });
    });
  };
};

Promise.promisifyAll = function(obj){
  Object.keys(obj).forEach(key=>{
    if(typeof obj[key]==='function'){
      obj[key+'Async'] = Promise.promisify(obj[key]);
    }
  });
};

// mjs
// export default = Promise;
module.exports = Promise;