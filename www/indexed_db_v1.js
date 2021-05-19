define(function(A,B,m){!function(){function u(a){return new Promise(function(b,c){a.onsuccess=function(){b(a.result)};a.onerror=function(){c(a.error)}})}function n(a,b,c){var e,d=new Promise(function(d,y){e=a[b].apply(a,c);u(e).then(d,y)});return d.request=e,d}function z(a,b,c){var e=n(a,b,c);return e.then(function(a){return a?new k(a,e.request):void 0})}function h(a,b,c){c.forEach(function(c){Object.defineProperty(a.prototype,c,{get:function(){return this[b][c]},set:function(a){this[b][c]=a}})})}
function t(a,b,c,e){e.forEach(function(d){d in c.prototype&&(a.prototype[d]=function(){return n(this[b],d,arguments)})})}function p(a,b,c,e){e.forEach(function(d){d in c.prototype&&(a.prototype[d]=function(){return this[b][d].apply(this[b],arguments)})})}function w(a,b,c,e){e.forEach(function(d){d in c.prototype&&(a.prototype[d]=function(){return z(this[b],d,arguments)})})}function g(a){this._index=a}function k(a,b){this._cursor=a;this._request=b}function f(a){this._store=a}function l(a){this._tx=
a;this.complete=new Promise(function(b,c){a.oncomplete=function(){b()};a.onerror=function(){c(a.error)};a.onabort=function(){c(a.error)}})}function q(a,b,c){this._db=a;this.oldVersion=b;this.transaction=new l(c)}function r(a){this._db=a}h(g,"_index",["name","keyPath","multiEntry","unique"]);t(g,"_index",IDBIndex,["get","getKey","getAll","getAllKeys","count"]);w(g,"_index",IDBIndex,["openCursor","openKeyCursor"]);h(k,"_cursor",["direction","key","primaryKey","value"]);t(k,"_cursor",IDBCursor,["update",
"delete"]);["advance","continue","continuePrimaryKey"].forEach(function(a){a in IDBCursor.prototype&&(k.prototype[a]=function(){var b=this,c=arguments;return Promise.resolve().then(function(){return b._cursor[a].apply(b._cursor,c),u(b._request).then(function(a){return a?new k(a,b._request):void 0})})})});f.prototype.createIndex=function(){return new g(this._store.createIndex.apply(this._store,arguments))};f.prototype.index=function(){return new g(this._store.index.apply(this._store,arguments))};h(f,
"_store",["name","keyPath","indexNames","autoIncrement"]);t(f,"_store",IDBObjectStore,"put add delete clear get getAll getKey getAllKeys count".split(" "));w(f,"_store",IDBObjectStore,["openCursor","openKeyCursor"]);p(f,"_store",IDBObjectStore,["deleteIndex"]);l.prototype.objectStore=function(){return new f(this._tx.objectStore.apply(this._tx,arguments))};h(l,"_tx",["objectStoreNames","mode"]);p(l,"_tx",IDBTransaction,["abort"]);q.prototype.createObjectStore=function(){return new f(this._db.createObjectStore.apply(this._db,
arguments))};h(q,"_db",["name","version","objectStoreNames"]);p(q,"_db",IDBDatabase,["deleteObjectStore","close"]);r.prototype.transaction=function(){return new l(this._db.transaction.apply(this._db,arguments))};h(r,"_db",["name","version","objectStoreNames"]);p(r,"_db",IDBDatabase,["close"]);["openCursor","openKeyCursor"].forEach(function(a){[f,g].forEach(function(b){b.prototype[a.replace("open","iterate")]=function(){var b=Array.prototype.slice.call(arguments),e=b[b.length-1],d=this._store||this._index,
v=d[a].apply(d,b.slice(0,-1));v.onsuccess=function(){e(v.result)}}})});[g,f].forEach(function(a){a.prototype.getAll||(a.prototype.getAll=function(a,c){var b=this,d=[];return new Promise(function(e){b.iterateCursor(a,function(a){return a?(d.push(a.value),void 0!==c&&d.length==c?void e(d):void a["continue"]()):void e(d)})})})});var x={open:function(a,b,c){b=n(indexedDB,"open",[a,b]);var e=b.request;return e.onupgradeneeded=function(a){c&&c(new q(e.result,a.oldVersion,e.transaction))},b.then(function(b){return{db:new r(b),
get:function(b){return this.db.transaction(a).objectStore(a).get(b)},set:function(b,c){var d=this.db.transaction(a,"readwrite");d.objectStore(a).put(c,b);return d.complete},"delete":function(b){var c=this.db.transaction(a,"readwrite");c.objectStore(a)["delete"](b);return c.complete},clear:function(){var b=this.db.transaction(a,"readwrite");b.objectStore(a).clear();return b.complete},keys:function(){var b=this.db.transaction(a),c=[],d=b.objectStore(a);(d.iterateKeyCursor||d.iterateCursor).call(d,function(a){if(a)return c.push(a.key),
a["continue"](),b.complete.then(Object.keys(c))})}}})},"delete":function(a){return n(indexedDB,"deleteDatabase",[a])}};"undefined"!=typeof m?(m.exports=x,m.exports["default"]=m.exports):self.idb=x}()});