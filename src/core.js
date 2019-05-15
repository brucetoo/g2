//度量
const Scale = require('@antv/scale/lib');
//渲染核心库 TODO 有点大，还没准备开始看
const G = require('./renderer');
//动画
const Animate = require('./animate/animate');
//图表
const Chart = require('./chart/chart');
//全局变量
const Global = require('./global');
//图形管理库
const Shape = require('./geom/shape/shape');
//工具库 base lodash
const Util = require('./util');

//定义一个全局对象hold所有的信息
const G2 = {
  // version
  version: Global.version,
  // visual encoding
  Animate,
  Chart, // 一切出它开始
  Global,
  Scale,
  Shape,
  Util,
  // render engine
  G,
  DomUtil: Util.DomUtil,
  MatrixUtil: Util.MatrixUtil,
  PathUtil: Util.PathUtil
};

// G2.track = function(enable) {
//   Global.trackable = enable;
// };
// require('./track');
G2.track = () => {
  console.warn('G2 tracks nothing ;-)');
};

// 保证两个版本共存 TODO 用window来判断何解？
if (typeof window !== 'undefined') {
  if (window.G2) {
    console.warn(`There are multiple versions of G2. Version ${G2.version}'s reference is 'window.G2_3'`);
  } else {
    window.G2 = G2;
  }
}

module.exports = G2;
