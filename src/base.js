/**
 * @fileOverview Chart、View、Geometry 的基类
 * @author dxq613@gmail.com
 */

const EventEmitter = require('wolfy87-eventemitter');
const Util = require('./util');

//基于eventEmitter 使得自己的模块具有事件的触发和监听功能
class Base extends EventEmitter {

  getDefaultCfg() {
    return {};
  }

  //关于类私有属性和类语法糖详解：http://es6.ruanyifeng.com/#docs/class
  constructor(cfg) {
    super();
    const attrs = {
      visible: true
    };
    const defaultCfg = this.getDefaultCfg();
    this._attrs = attrs;
    //将defaultCfg & cfg 和 attrs 属性组合起来
    Util.assign(attrs, defaultCfg, cfg);
  }

  get(name) {
    return this._attrs[name];
  }

  set(name, value) {
    this._attrs[name] = value;
  }

  show() {
    const visible = this.get('visible');
    if (!visible) {
      this.set('visible', true);
      this.changeVisible(true);
    }
  }

  hide() {
    const visible = this.get('visible');
    if (visible) {
      this.set('visible', false);
      this.changeVisible(false);
    }
  }

  /**
   * @protected
   * @param {Boolean} visible 是否可见
   * 显示、隐藏事件
   */
  changeVisible(/* visible */) {

  }

  destroy() {
    this._attrs = {};
    this.removeAllListeners();
    this.destroyed = true;
  }
}

module.exports = Base;
