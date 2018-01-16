目录 (づ￣ 3￣)づ=>

[TOC]

## 序
本文会对Promise规范进行一个比较完整的实现，目的是为了加深对Promise各个特性的理解从而更好的应用。

>[warning] **注意**：本文依据[Promises/A+](https://promisesaplus.com)规范进行Promise的实现

## 1.Promise/A+ 术语
### 1.1. promise
>  promise是一个对象或则函数，它的表现是依据[Promises/A+](https://promisesaplus.com)这篇规范说明来定义的。

1.1. `promise` is an object or function with a then method whose behavior conforms to this specification.

### 1.2. theable
> thenable是一个定义了then方法的对象或则函数。

`thenable` is an object or function that defines a then method.

### 1.3. value
>value可以是任何合法的JS值，甚至包括undefined、一个thenable、一个promise。

`value` is any legal JavaScript value (including undefined, a thenable, or a promise).

### 1.4. exception
> exception是一个用throw语句抛出的值。

`exception` is a value that is thrown using the throw statement.

### 1.5. reason
> reason是一个为什么promise会被拒绝的理由。

`reason` is a value that indicates why a promise was rejected.

## Promise规范要求
>[info] 判断一个东东是不是Promise，有三项主要的特征可作为参考
- Promise有三种状态 `pending` 、`fulfilled`、`rejected`
- Promise含有then方法
- Promise含有`Promise Resolution Procedure` （promise的状态转换处理方法）。

### 2.1. Promise状态
>[success] 一个promise必须处于 pending 、fulfilled、rejected 三种状态中的其中一种

下面是一个promise最基本的使用demo，我们先有个印象。
- 其中promise实例化的时候传入了一个函数作为参数，这个函数我们称之为 `executor` ，它能告诉我们何时将promise状态从pending转化为其余两态中的一态。
- 而 `then` 方法是实例化对象下的一个方法，它能传入两个参数，**一般**是两个回调函数，对应fulfilled和rejected两个状态，当promise从pengding状态转化成其中一个状态时就会触发对应的回调函数。
```
let p = new Promise((resolve,reject)=>{
  let x = Math.random();
  console.log(x);
  if (x > .5) {
    resolve('我是你许下的诺言的那个东东');
  } else {
    reject('我是你未能实现诺言的理由');
  }
});

p.then((value)=>{ //绑定成功时的回调函数
  console.log('fulfilled:',value); //fulfilled:我是你许下的诺言的那个东东
},(reason)=>{ //绑定失败时的回调函数
  console.log('rejected:',reason); //rejected:我是你未能实现诺言的理由
});
```
#### 2.1.1. pending状态
> 当Promise处于pending状态时，它可能转换为fulfilled或则rejected状态。

When pending, a promise:may transition to either the fulfilled or rejected state.

#### 2.1.2. fulfilled状态
> 当Promise处于fulfilled状态时，它不再能转换为其它状态 且 它必须有一个值，这个值不能被更改。

When fulfilled, a promise: 
- must not transition to any other state.
- must have a value, which must not change.

#### 2.1.3 rejected状态
> 当promise处于rejected时，它不再能转换为其它状态 且 它必须有一个理由，这个理由不能被更改。

When rejected, a promise: 
- must not transition to any other state.
- must have a reason, which must not change.

>[danger]**注意**: 当promise处于fulfilled或则rejected时，它都有一个值，这个值不能被更改，但是可以像使用常量一样在这个值下面挂载其它值。

Here, “must not change” means immutable identity (i.e. ===), but does not imply deep immutability.

### 2.1. Promise实现
**请先回顾一下我们在说Promise状态时候最初的那个demo**
我们通过实例化Promise时传入了一个参数，这个参数是一个执行函数（executor），它能决定什么时候将Promise转换成fulfilled什么时候转换成rejected。
```
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function Promise(executor){
  let self = this; //缓存下
  self.value = undefined; //用来存放value和reason,因为promise只会处于一种状态故可只用一个变量来表示。
  self.status = PENDING; //将初始状态设置为pending
  self.onFulfilledCallbacks = []; //用来存放所有成功的回调函数
  self.onRejectedCallbacks = []; //用来存放所有失败的回调函数

  try{
    executor(resolve,reject); //调用执行函数，将resolve和reject方法作为参数传入
  }catch (e){
    reject(e); //若执行函数中存在异常直接用抛出的值来拒绝promise
  }
  //-----------------------------------------------------------------------------------------------------------
  function resolve(value){ //此方法会随着executor传入而传入
    setTimeout(function(){
      if(self.status === PENDING){ //确保状态只会改变一次
        self.status = FULFILLED; //改变状态
        self.value = value; //赋予一个值
        self.onFulfilledCallbacks.forEach(cb => cb(self.value)); //2.2.2. //2.2.6.
      }
    })
  }
  function reject(reason){
    setTimeout(function(){
      if(self.status === PENDING){
        self.status = REJECTED;
        self.value = reason;
        self.onRejectedCallbacks.forEach(cb => cb(self.value));
      }
    })
  }
}

```
以上实现了2.1. ，promise的三种状态以及状态之间的改变。

>[info]#### executor，形参、实参、作用域链
我们可以发现最终转换状态时通过Promise内部的两个方法resolve和reject，这个两个方法是在什么时候传入的呢？
**一个函数的参数查找，是从调用这个函数时所处的作用域开始查找的。**
new Promise传入的executor，是参数也是对executor函数的定义，此时executor的resolve和reject为**形参**。
我们new Promise的时候，会执行构造函数Promise内的代码，也就是在这时executor被执行，而executor此时所处的作用域是在Promise构造函数内部，resolve和reject方法作为**实参**被传入。

### 2.2. then方法
>[success] 一个promise必须提供一个then方法来使用它将要或则说已经被赋予的 value 或则 reason，一个promise的then方法接收两个参数

```
promise.then(onFulfilled,onRejected)
```
#### 2.2.1. then参数
> then中的参数皆为可选参数，如果onFulfilled或则说onRejected不是一个函数，那么将会被忽略。

Both onFulfilled and onRejected are optional arguments: 
- If onFulfilled is not a function, it must be ignored.
- If onRejected is not a function, it must be ignored.

#### 2.2.2. 如果onFulfilled是一个函数
- 如果onFulfilled是一个函数，它必须在promise状态转换为fulfilled时候就被调用，并且promise被赋予的value会成为这个函数(onFulfilled)的第一个参数。
- onFulfilled不能在promise状态转化为fulfilled前就调用
- onFulfilled函数不能重复调用

原文规范详见[Promises/A+](https://promisesaplus.com)
#### 2.2.3. 如果onRejected是一个函数
- 如果onRejected是一个函数，它必须在promise状态转换为rejected时候就被调用，并且promise被赋予的reason会成为这个函数(onRejected)的第一个参数。
- onRejected不能在promise状态转化为rejected前就调用
- onRejected函数不能重复调用
#### 2.2.4. onFulfilled 或则 onRejected  必须在执行栈 只存在 `platform code` 时才能被调用。
#### 2.2.5. onFulfilled 和 onRejected 必须被当做函数调用。
#### 2.2.6. 同一个promise实例可以调用多次then
- 当一个promise转化为fulfilled状态，所有onFulfilled callback会按照回调函数通过then添加时的顺序而执行。
- 当一个promise转化为rejected状态，所有onRejected callback会按照回调函数通过then添加时的顺序而执行。

**释**:then在同一个promise实例下多次调用，意味着可以在同一个promise的同一种状态下绑定多个不同的回调函数，而这些回调函数执行的顺序和它们被绑定时的顺序相同。
#### 2.2.7. then必会返回一个新的promise
```
promise2 = promise1.then(onFulfilled,onRejected);
```
- 如果onFulfilled或onRejected回调函数中返回了一个值，假定为x，那么调用一个 promise解析方法 `[[Resolve]](promise2,x)`。
- 如果onFulfilled或者onRejected抛出了一个 `exception`(异常) `e` , `promise2` 必须以这个e作为reason来拒绝promise，使其状态改变为rejected。
- 如果onFulfilled不是一个函数且 `promise1` 的状态为fulfilled，`promise2`必须以 `promise1`  的值来fulfilled。
- 如果onRejected不是一个函数且 `promise1` 的状态为rejected，`promise2`必须以 `promise1`  的理由来rejected。

### 2.2. Promise实现
2.2.提的是一个then的实现规则，而then主要作用为promise绑定回调函数，当promise转换状态时会自动调用对应的回调函数。(对应规范2.2.2-2.2.3)
**其实就是发布订阅模式啦**
```
function Promise(){
	...
    function resolve(value){ 
    setTimeout(function(){ //2.2.4.
      if(self.status === PENDING){ //2.2.2.3-2.2.2.4
        self.status = FULFILLED; 
        self.value = value; 
        self.onFulfilledCallbacks.forEach(cb => cb(self.value)); //2.2.6.
      }
    })
  }
  function reject(reason){
    setTimeout(function(){
      if(self.status === PENDING){ //2.2.3.3-2.2.3.4
        self.status = REJECTED;
        self.value = reason;
        self.onRejectedCallbacks.forEach(cb => cb(self.value));
      }
    })
  }
}
//---------------------------------------------------------------------------------------------------
Promise.prototype.then = function (onFulfilled, onRejected) { //2.2.1.
  //2.2.7.3-2.2.7.4 //2.2.5.
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
  onRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason};

  let self = this,
    promise2; //2.2.7.0 //声明要返回的promise2

  if(self.status === PENDING){
    //2.2.7.
    return promise2 = new Promise(function(resolve,reject){
      //存储then方法绑定的回调函数 //2.2.6.
      self.onFulfilledCallbacks.push((value)=>{
        try{
          let x = onFulfilled(value);
          resolvePromise(promise2,x,resolve,reject); //2.2.7.1
        }catch (e){
          reject(e); //2.2.7.2
        }
      });
      self.onRejectedCallbacks.push((reason)=>{
        try{
          let x= onRejected(reason);
          resolvePromise(promise2,x,resolve,reject);
        }catch (e){
          reject(e);
        }
      });
    });
  }
};
```

#### 关于platform code
Here “platform code” means engine, environment, and promise implementation code. In practice, this requirement ensures that onFulfilled and onRejected execute asynchronously, after the event loop turn in which then is called, and with a fresh stack. This can be implemented with either a “macro-task” mechanism such as setTimeout or setImmediate, or with a “micro-task” mechanism such as MutationObserver or process.nextTick. Since the promise implementation is considered platform code, it may itself contain a task-scheduling queue or “trampoline” in which the handlers are called.

上面一大段话的意思大致上就是要求 `onFulfilled` 和 `onRejected` 回调函数确保异步执行。我们可以选择用宏任务(setTimeout/setImmediate)或则微任务(process.nextTix/MutationObserver)来完成这项规范。

**这里我们通过在Promise中的resolve和reject方法中套了一个setTimeout()来实现。**

```
 function resolve(value){ 
    setTimeout(function(){ //2.2.4.
      if(self.status === PENDING){ //2.2.2.3-2.2.2.4
        self.status = FULFILLED; 
        self.value = value; 
        self.onFulfilledCallbacks.forEach(cb => cb(self.value)); //2.2.6.
      }
    })
  }
```
这样setTimeout中的代码就会在下一个新的执行栈中执行。**即使executor中的代码是同步代码也一样**。
```
let p = new Promise((resolve,reject)=>{
  setTimeout(()=>{
    resolve('resolve');
  })
});
p.then((value)=>{
  console.log('fulfilled:',value);
},(reason)=>{
  console.log('rejected:',reason);
});
console.log('----------------');

//输出
>>>----------------
>>>fulfilled: resolve
//----------------------------------------------------------------------------------
let p = new Promise((resolve,reject)=>{
    resolve('resolve');
});
p.then((value)=>{
  console.log('fulfilled:',value);
},(reason)=>{
  console.log('rejected:',reason);
});
console.log('----------------');

//输出
>>>----------------
>>>fulfilled: resolve
```
#### 情景：值的穿透
下面的例子中本应是第一个then中的参数会穿透到第二then中作为参数。
**下面两句再集合resolvePromise方法即是穿透原因**
```
Promise.prototype.then = function (onFulfilled, onRejected) { //2.2.1.
  //2.2.7.3-2.2.7.4 //2.2.5.
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value; //结合resolvePromise方法即是穿透原因
  onRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason}; //继续把异常往后抛
  ...

//-------------------------------------------------
let p = new Promise((resolve,reject)=>{
  resolve('resolve');
});
p.then().then((value)=>{
  console.log(value); //会输出resolve
});
```

### 2.3. Promise状态解析方法(promise resolution procedure)
```
let x= onRejected(reason);
resolvePromise(promise2,x,resolve,reject); //resolve/reject为promise2的resolve/reject
```
Promise状态解析方法的作用是将then时返回的promise2的状态改变并赋予其vlaue/reason。
- 如果 `x` 是一个thenable，那么该方法将试图将以 `x` 的状态来改变 `promise2` 的状态
- 否则就将 `promise2` 改成 `fulfilled` 状态，并且value即为 `x` 的值

#### 2.3.1. 如果 `promise2` 和 `x` 是引用关系，则抛出一个 `TypeError` 做为理由来 `reject ` promise2。
#### 2.3.2. 如果 `x` 是一个promise ,让promise2采用它的状态。
- 如果 `x` 处于pending，promise2 必须保持pending直到 x 转换为 fulfilled或则rejected。
- 如果 `x` 是 `fulfilled`状态，让promise2也为fulfilled，并且让promise2的value为x的value。
- 如果 `x` 是 `rejected`状态，让promise2也为rejected，并且让promise2的value为x的reason。
#### 2.3.3. 如果 `x` 是一个对象或则函数
- Let `then` be `x.then`
- 如果检索 `x.then` 时候抛出了一个异常`e`，那么以这个 `e`来 `rejecte`  promise2。
- 如果 `then` 是一个函数，用`x`作为`this`，`resolvePromise`作为第一个参数，`rejectPromise`作为第二个参数来 `call`它。
	- 如果`resolvePromise`被调用，**循环调用** `promise状态解析方法`（原本的x替换为调用resolvePromise传入的参数，假定为y）。
	- 如果`rejectPromise`被调用，则reject Promise2，reason为调用rejectPromise传入的参数
	- 如果`resolvePromise` 和 `rejectPromise` 同时被调用或则多次调用，那么第一个调用的拥有优先权，其它的会被忽略。
	- 如果调用 `then` 的时候抛出了一个异常 `e`
		- 如果 `resolvePromise` 或  `rejectPromise` 已经被调用，则忽略它。
		- 否则，则用这个`e`来 `reject` promise2。
- 如果then不是一个函数，则用`x`来`fulfilled `promise2
#### 2.3.4. 如果 `x` 不是一个函数也不是一个对象，则用`x`来`fulfilled `promise2

### 2.3.3. Promise实现
resolvePromise方法针对的是then绑定的回调函数中的return值进行解析，一般情况是：
- 当return的是普通类型的值，那么会以这个值来fulfilled promise2
- 如果是一个promise，那么会以这个x promise的结果来fulfilled/rejected promise2
```
function resolve(value) {
    if(value instanceof Promise){ //和resolvePromise有点联系的是 当then return的promise中又resolve了一个promise会先走这，会将resolve里的promise的值赋给调用resolve的promise（说法欠妥，意会即可）
      return value.then(resolve,reject); //这意味着如果promise1 resolve中是一个promise2，那么promise1状态的改变时间会被推迟，直到promise2状态改变调用promise2的回调时，promise1状态才会改变才会触发promise1的回调
    }
...
//---------------------------------------------------------------------------------------------------------
function resolvePromise(promise2,x,resolve,reject){
  if(x === promise2){ //2.3.1.
    return reject(new TypeError('禁止循环引用!'));
  }
  let called =false;

  //2.3.2.
  if(x instanceof Promise){
    if(x.status === PENDING){ //2.3.2.1
      x.then((y)=>{
        resolvePromise(promise2,y,resolve,reject); //因为此时的y，有可能也是一个promise //挂上一个钩子只要x状态转化为成功态就递归调用resolvePromise
      },reject);
    }else{ //此分支存在的意义在于若executor调用resolve/reject不是异步的且不在resolve/reject中设置setTimeout，意味着当new的时候就会返回一个带状态的promise就会走这里。
      x.then(resolve,reject); //2.3.2.2-2.3.2.3 //只要x状态改变，就以x的状态和值来改变promise2的状态和值 //这个值可能是一个promise，前提是在上面那种假设实现中 //如果不符合上面那种实现且不想像规范一样允许值可以为一个promise或则对象 可除去此分支
    }
  }else if(x!=null&&((typeof x === 'function')||(typeof x === 'object'))){ //2.3.3.
    try{
      let then = x.then; //2.3.3.1

      if(typeof then === 'function'){
        //2.3.3.3.
        then.call(x,(y)=>{
          if(called) return; //2.3.3.3.3.
          called = true;
          resolvePromise(promise2,y,resolve,reject); //在resolve中又包含promise的情况下，由于resolve中的 value.then存在，当前回调调用时，resolve中的promise状态一定已经改变，在状态已经改变的时候利用then绑定回调，会走then中的status==fulfilled或则rejected分支
        },(reason)=>{
          if(called) return;
          called = true;
          reject(reason);
        });
      }else{
        resolve(x); //2.3.3.4. //1.3
      }
    }catch (e){
      if(called) return; //2.3.3.3.4.1.
      called = true;
      reject(e); //2.3.3.2. //2.3.3.3.4.2.
    }

  }else{ //2.3.4.
    resolve(x);
  }
}
```
#### 情景：当return的是promise且该promise的resolve/reject ()中 也是一个promise
```
let p = new Promise((resolve,reject)=>{
  resolve('resolve1');
});
p.then((value)=>{
  return new Promise((resolve,reject)=>{
    resolve(new Promise((resolve,reject)=>{
      setTimeout(()=>{
        resolve('别怂')
      });
    }));
  });
}).then((value)=>{
  console.log(value); //别怂
});
console.log('----------------');
```
可见最终的value值为最里层的value值，这样的实现关键在于递归调用resolvePromise。
```
...
function resolve(value) {
    if(value instanceof Promise){ 
      return value.then(resolve,reject);
...

if(x instanceof Promise){
    if(x.status === PENDING){ //2.3.2.1
      x.then((y)=>{
        resolvePromise(promise2,y,resolve,reject); 
      },reject);
    }else{
      x.then(resolve,reject); 
    }
  }

```
以上这段代码，当promise1执行回调的时候，会将x传入resolvePromise执行，此时由于resolve()方法中的setTimeout，该x是pending状态进pending分支，该分支会为X挂上一个钩子，当它状态转换后会再次调用resolvePromise。
- 如果x的resolve中传入的也是一个promise （y），由于resolve中添加的value.then，它会推迟x的状态转换，这意味着X状态转换时，y的状态一定已经转换，于是会走下面那个分支，调用y.then，**而因为y的状态已经转换，在then方法中此时就不再能通过状态改变时触发回调函数**，故要支持此功能需要在then中添加`self.status===FULFILLED/REJECTED`分支。
```
}else if(self.status === FULFILLED){
    return promise2 = new Promise(function(resolve,reject){
      setTimeout(function(){
        try{
          let x =onFulfilled(self.value);
          resolvePromise(promise2,x,resolve,reject);
        }catch(e){
          reject(e);
        }
      })

    });
  }else{
    return promise2 = new Promise(function(resolve,reject){
      setTimeout(function(){
        try{
          let x =onRejected(self.value);
          resolvePromise(promise2,x,resolve,reject);
        }catch(e){
          reject(e);
        }
      })
    });
  }
```
这里用了setTimeout是为了确保回调函数会异步执行。（针对2.2.4.）

- 如果x的resolve传入的只是一个普通的值。。。呵呵哒，那就直接resolve(x)咯

>[warning] **值得注意的是**: 如果没有在 `resolve()` 方法中对value进行判断，那么此时嵌套promise中再嵌套一层promise输出结果会是一个promise。因为第二个promise不会等第三个promise状态转换后才转换状态，这意味着第二个promise的值就为第三个promise对象。

#### 情景：当new的promise中的resolve也是一个promise，而这个promise的resolve中又是一个promise...
此时情况同上个情景，得益于`then()`中对value的判断，它会推迟父promise状态的转变。
如果没有这个判断和推迟，那么也可能最终得到的value是个promise对象。（这是规范允许的，但NodeJS和blubird对promise规范的实现都对父promise的状态转换进行了推迟）
#### x instanceof Promise 和 typeof x=function... 递归的区别
instance分支下的递归 因为存在对promise状态的判断，当`resolve()`没有对value进行判断时，instance分支下的结果value最终可能为promise对象，而x.then分支下因为没有对promise状态进行判断，故不会出现value为promise对象的情况。
## 其余Promise方法的实现
### Promise.prototype.catch
此方法实现灰常简单，只需在最后一个then绑定完回调后再绑定一个错误的回调即可
```
promise.prototype.catch = function(onRejected){
	this.then(null,onRejected);
}
```
### Promise.all
此方法传入一组promise实例再返回一个最终的promise实例，当所有promise都转为fulfilled时返回的最终的promise实例将会转换为fulfilled，此时这个promise的值为传入的promise的值的集合。而如果传入的那组promise中有一个rejected，返回的promise就会rejected。
```
Promise.all = function(promises){
	return new Promise((resolve,reject)=>{
        let result = [],
            count = 0;

        function done(i,data){
            result[i] = data;
            if(++count===promises.length){
                resolve(result);
            }
        }
        for(let i=0;i<promises.length;++i){
        	promises[i].then((value)=>{
            	done(i,value);
            },(reason)=>{
            	reject(reason);
            });
        }
    });
}
```
### Promise.race
也是传入一组promise返回一个promise，哪个promise先转换状态，就返回这个promise的结果
```
Promise.race = function(promises){
	return new Promise((resolve,reject)=>{
    	for(let i=0;i<promises.length;++){
        	promises[i].then(resolve,reject);
        }
    });
}
```
### Promise.promisify
将一个异步函数promise化，使其可以then，可以链式书写
```
Promise.promisify = function(fn){
	return function(...args){
    	return new Promise((resolve,reject)=>{
        	fn.apply(null,[...args,function(err,data){
            	err?reject(err):resolve(data);
            }]);
        });
    }
}
```
### Promise.promisifyAll
将一个对象下的所有方法都promisify化
```
Promise.promisifyAll = function(obj){
	for(var attr in obj){
    	if(obj.hasOwnProperty(key)&&typeof obj[attr]==='function'){
        	obj[attr+'Async'] = Promise.promisify(obj[attr]);
        }
    }
}
```
## 测试
要对实现的Promise进行测试，除了实现t规范要求then方法和catch方法外还需要先在你的promise下添加一个方法
```
Promise.deferred = Promise.defer = function(){
  let defer = {};
  defer.promise = new Promise(function(resolve,reject){
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
}
```
然后按下述进行测试
```
npm i -g promises-aplus-tests
promises-aplus-tests yourFileName.js
```
## 实现代码【终板】
```
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function Promise(executor) {
  let self = this; //缓存下
  self.value = undefined; //用来存放value和reason,因为promise只会处于一种状态故可只用一个变量来表示。
  self.status = PENDING; //将初始状态设置为pending
  self.onFulfilledCallbacks = []; //用来存放所有成功的回调函数
  self.onRejectedCallbacks = []; //用来存放所有失败的回调函数

  try {
    executor(resolve, reject); //调用执行函数，将resolve和reject方法作为参数传入
  } catch (e) {
    reject(e); //若执行函数中存在异常直接用抛出的值来拒绝promise
  }

  function resolve(value) {
    if (value instanceof Promise) { //和resolvePromise有点联系的是 当then return的promise中又resolve了一个promise会先走这，会将resolve里的promise的值赋给调用resolve的promise（说法欠妥，意会即可）
      return value.then(resolve, reject); //这意味着如果promise1 resolve中是一个promise2，那么promise1状态的改变时间会被推迟，直到promise2状态改变调用promise2的回调时，promise1状态才会改变才会触发promise1的回调
    }

    setTimeout(function () {
      if (self.status === PENDING) {
        self.status = FULFILLED;
        self.value = value;
        self.onFulfilledCallbacks.forEach(cb => cb(self.value)); //2.2.2. //2.2.6.
      }
    })
  }

  function reject(reason) {
    setTimeout(function () {
      if (self.status === PENDING) {
        self.status = REJECTED;
        self.value = reason;
        self.onRejectedCallbacks.forEach(cb => cb(self.value)); //2.2.3. //2.2.6.
      }
    })
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) { //2.2.1.
  //2.2.7.3-2.2.7.4 //2.2.5.
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
  onRejected = typeof onRejected === 'function' ? onRejected : reason => {
    throw reason
  };

  let self = this,
    promise2; //2.2.7.0 //声明要返回的promise2

  if (self.status === PENDING) {
    //2.2.7.
    return promise2 = new Promise(function (resolve, reject) {
      //存储then方法绑定的回调函数 //2.2.6.
      self.onFulfilledCallbacks.push((value) => {
        try {
          let x = onFulfilled(value);
          resolvePromise(promise2, x, resolve, reject); //2.2.7.1 //resolve/reject属于promise2 //若此方法执行说明promise1状态已经更改
        } catch (e) {
          reject(e); //2.2.7.2
        }
      });
      self.onRejectedCallbacks.push((reason) => {
        try {
          let x = onRejected(reason);
          resolvePromise(promise2, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    });
  } else if (self.status === FULFILLED) {
    return promise2 = new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          let x = onFulfilled(self.value);
          resolvePromise(promise2, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      })

    });
  } else {
    return promise2 = new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          let x = onRejected(self.value);
          resolvePromise(promise2, x, resolve, reject);
        } catch (e) {
          reject(e);
        }
      })
    });
  }

};

function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) { //2.3.1.
    return reject(new TypeError('禁止循环引用!'));
  }
  let called = false;

  //2.3.2.
  if (x instanceof Promise) {
    if (x.status === PENDING) { //2.3.2.1
      x.then((y) => {
        resolvePromise(promise2, y, resolve, reject); //因为此时的y，有可能也是一个promise //挂上一个钩子只要x状态转化为成功态就递归调用resolvePromise
      }, reject);
    } else { //此分支存在的意义在于若executor调用resolve/reject不是异步的且不在resolve/reject中设置setTimeout，意味着当new的时候就会返回一个带状态的promise就会走这里。
      x.then(resolve, reject); //2.3.2.2-2.3.2.3 //只要x状态改变，就以x的状态和值来改变promise2的状态和值 //这个值可能是一个promise，前提是在上面那种假设实现中 //如果不符合上面那种实现且不想像规范一样允许值可以为一个promise或则对象 可除去此分支
    }
  } else if (x != null && ((typeof x === 'function') || (typeof x === 'object'))) { //2.3.3.
    try {
      let then = x.then; //2.3.3.1

      if (typeof then === 'function') {
        //2.3.3.3.
        then.call(x, (y) => {
          if (called) return; //2.3.3.3.3.
          called = true;
          resolvePromise(promise2, y, resolve, reject); //在resolve中又包含promise的情况下，由于resolve中的 value.then存在，当前回调调用时，resolve中的promise状态一定已经改变，在状态已经改变的时候利用then绑定回调，会走then中的status==fulfilled或则rejected分支
        }, (reason) => {
          if (called) return;
          called = true;
          reject(reason);
        });
      } else {
        resolve(x); //2.3.3.4. //1.3
      }
    } catch (e) {
      if (called) return; //2.3.3.3.4.1.
      called = true;
      reject(e); //2.3.3.2. //2.3.3.3.4.2.
    }

  } else { //2.3.4.
    resolve(x);
  }
}

Promise.deferred = Promise.defer = function () {
  let defer = {};
  defer.promise = new Promise(function (resolve, reject) {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
};

Promise.prototype.catch = function (onRejected) {
  this.then(null, onRejected)
};

Promise.resolve = function (value) {
  return new Promise((resolve, reject) => {
    resolve(value);
  })
};

Promise.reject = function (reason) {
  return new Promise((resolve, reject) => {
    reject(reason);
  })
};


Promise.all = function(promises){
  return new Promise((resolve,reject)=>{
    let result = [];
    let count = 0;
    function done(i,data){
      result[i] = data;
      if(++count === promises.length){
        resolve(result);
      }
    }
    for(let i=0;i<promises.length;++i){
      promises[i].then((value)=>{
        done(i,value);
      },reject);
    }
  })
};

Promise.race = function(promises){
  return new Promise(function(resolve,reject){
    for(let i=0;i<promises.length;++i){
      promises[i].then(resolve,reject);
    }
  });
};

Promise.promisify = function(fn){
  return function(...args){
    return new Promise((resolve,reject)=>{
      fn.apply(null,[...args,function(err,data){
        err?reject(err):resolve(data);
      }]);
    });
  }
};

Promise.promisifyALL = function(obj){
  for(var key in obj){
    if(obj.hasOwnProperty(key)&&typeof obj[key]=='function'){
      obj[key+'Async'] = Promise.promisify(obj[key]);
    }
  }
};
module.exports = Promise;
```