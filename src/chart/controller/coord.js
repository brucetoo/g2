/**
 * @fileOverview The controller of coordinate
 * @author sima.zhang
 */
const Util = require('../../util');
const Coord = require('@antv/coord/lib/');

//要么从options中配置，要么使用 chart.coord()来配置
class CoordController {
  //此option是chart中options对象中的 coords配置
  constructor(option) {
    //可取值: rect polar theta map helix gauge clock
    this.type = 'rect';
    //坐标系需要进行的变换操作
    /**
      具体的值分为:
     rotate(angle): 坐标系旋转，angle 表示旋转的度数，单位为角度。
     scale(sx, sy): 坐标系缩放，sx 代表 x 方向缩放比例，sy 代表 y 方向缩放比例，单位为数值。
     reflect('' | 'x' | 'y'): 坐标系转置，将 x 或者 y 的起始、结束值倒置。
     transpose(): 将坐标系 x 轴和 y 轴转置
     */
    this.actions = [];
    //可选配置项，是一个对象类型，仅适用于极坐标类型，包括 polar(极坐标)、theta(饼图)、helix(螺旋坐标系)。
    /**
      数据格式如下：
     {
       radius: 0.5, // 设置半径，值范围为 0 至 1
       innerRadius: 0.3, // 空心圆的半径，值范围为 0 至 1
       startAngle: -1 * Math.PI / 2, // 极坐标的起始角度，单位为弧度
       endAngle: 3 * Math.PI / 2 // 极坐标的结束角度，单位为弧度
    */
    this.cfg = {};
    Util.mix(this, option);
    this.option = option || {};
  }

  reset(coordOption) {
    this.actions = coordOption.actions || [];
    this.type = coordOption.type;
    this.cfg = coordOption.cfg;
    this.option.actions = this.actions;
    this.option.type = this.type;
    this.option.cfg = this.cfg;
    return this;
  }

  _execActions(coord) {
    const actions = this.actions;
    Util.each(actions, function(action) {
      const m = action[0];
      coord[m](action[1], action[2]);
    });
  }

  hasAction(actionName) {
    const actions = this.actions;
    let rst = false;
    Util.each(actions, function(action) {
      if (actionName === action[0]) {
        rst = true;
        return false;
      }
    });
    return rst;
  }
  /**
   * 创建坐标系对象
   * @param  {Object} start 坐标系起始点
   * @param  {Object} end   坐标系结束点
   * @return {Function} 坐标系的构造函数 -- 哈皮，明明是返回的实例
   */
  createCoord(start, end) {
    const self = this;
    //这些参数在coordController初始的时候已经有设置了
    const type = self.type;
    const cfg = self.cfg;
    let C; // 构造函数
    let coord;

    const coordCfg = Util.mix({
      start,
      end
    }, cfg);

    if (type === 'theta') { // definition of theta coord
      C = Coord.Polar;

      if (!self.hasAction('transpose')) {
        self.transpose(); // 极坐标，同时transpose
      }
      coord = new C(coordCfg);
      coord.type = type;
    } else {
      C = Coord[Util.upperFirst(type || '')] || Coord.Rect;
      coord = new C(coordCfg);
    }

    self._execActions(coord);
    return coord;
  }

  rotate(angle) {
    angle = angle * Math.PI / 180;
    this.actions.push([ 'rotate', angle ]);
    return this;
  }

  reflect(dim) {
    this.actions.push([ 'reflect', dim ]);
    return this;
  }

  scale(sx, sy) {
    this.actions.push([ 'scale', sx, sy ]);
    return this;
  }

  transpose() {
    this.actions.push([ 'transpose' ]);
    return this;
  }
}

module.exports = CoordController;
