/**
 * @fileOverview G2 图表的入口文件
 * @author dxq613@gmail.com
 */

const Util = require('../util');
const View = require('./view');
const G = require('../renderer');
const Canvas = G.Canvas;
const DomUtil = Util.DomUtil;
const Global = require('../global');
const Plot = require('../component/plot');
const Controller = require('./controller/index');
//类似绘制区域的rect坐标?
const mergeBBox = require('./util/merge-bbox');
const bboxOfBackPlot = require('./util/bbox-of-back-plot');
const plotRange2BBox = require('./util/plot-range2bbox');

const AUTO_STR = 'auto';

function _isScaleExist(scales, compareScale) {
  let flag = false;
  Util.each(scales, scale => {
    const scaleValues = [].concat(scale.values);
    const compareScaleValues = [].concat(compareScale.values);
    if (scale.type === compareScale.type && scale.field === compareScale.field && scaleValues.sort().toString() === compareScaleValues.sort().toString()) {
      flag = true;
      return;
    }
  });

  return flag;
}

//判断array是否相等
function isEqualArray(arr1, arr2) {
  return Util.isEqualWith(arr1, arr2, (v1, v2) => v1 === v2);
}

/**
 * 图表的入口
 * @class Chart
 *const options = {
  scales: {object}, // 列定义声明
  coord: {object}, // 坐标系配置
  axes: {object}, // 坐标轴配置
  legends: {object}, // 图例配置
  guides: {array}, // 图表辅助元素配置
  filters: {object}, // 数据过滤配置
  tooltip: {object}, // 提示信息配置
  facet: {object}, // 分面配置
  geoms: {array} // 图形语法相关配置
}
 */
class Chart extends View {
  /**
   * 获取默认的配置属性
   * @protected
   * @return {Object} 默认属性
   */
  getDefaultCfg() {
    const viewCfg = super.getDefaultCfg();
    //G2.Chart({cfg}) 中的配置在构造函数的时候就已经一一对应初始化了
    return Util.mix(viewCfg, { //chart，facet,view 默认的config都是不同的
      id: null,
      forceFit: false,
      container: null,
      wrapperEl: null,
      canvas: null,
      width: 500,
      height: 500,
      pixelRatio: null,//像素比?
      backPlot: null,
      frontPlot: null,
      plotBackground: null,
      padding: Global.plotCfg.padding,
      background: null,
      autoPaddingAppend: 5,
      limitInPlot: false,
      renderer: Global.renderer,
      // renderer: 'svg',
      views: []
    });
  }

  init() {
    const self = this;
    // -- 已经在父类view的constructor中就初始化
    const viewTheme = self.get('viewTheme');
    self._initCanvas();//new Canvas
    self._initPlot();
    self._initEvents();
    super.init(); // 调用 view.js 去初始化

    const tooltipController = new Controller.Tooltip({
      chart: self,
      viewTheme,
      options: {}
    });
    self.set('tooltipController', tooltipController);

    const legendController = new Controller.Legend({
      chart: self,
      viewTheme
    });
    self.set('legendController', legendController);
    self.set('_id', 'chart'); // 防止同用户设定的 id 同名
    self.emit('afterinit'); // 初始化完毕
  }

  _isAutoPadding() {
    const padding = this.get('padding');
    if (Util.isArray(padding)) {
      return padding.indexOf(AUTO_STR) !== -1;
    }
    return padding === AUTO_STR;
  }

  _getAutoPadding() {
    const padding = this.get('padding');
    // 图例在最前面的一层
    const frontPlot = this.get('frontPlot');
    const frontBBox = frontPlot.getBBox();

    // 坐标轴在最后面的一层
    const backPlot = this.get('backPlot');
    const backBBox = bboxOfBackPlot(backPlot, plotRange2BBox(this.get('plotRange')));

    //在两层中计算出满足最小的范围的group box即可, min...
    const box = mergeBBox(frontBBox, backBBox);
    const outter = [ //左上又下超出的部分
      0 - box.minY, // 上面超出的部分
      box.maxX - this.get('width'), // 右边超出的部分
      box.maxY - this.get('height'), // 下边超出的部分
      0 - box.minX
    ];
    // 如果原始的 padding 内部存在 'auto' 则替换对应的边
    const autoPadding = Util.toAllPadding(padding);
    for (let i = 0; i < autoPadding.length; i++) {
      if (autoPadding[i] === AUTO_STR) {
        const tmp = Math.max(0, outter[i]);//刚好把超出的部分padding了，就能看全绘制的图形
        //autoPaddingAppend是一个padding后添加的值 上面带间隔
        autoPadding[i] = tmp + this.get('autoPaddingAppend');
      }
    }
    return autoPadding;
  }

  // 初始化画布
  _initCanvas() {
    let container = this.get('container');
    const id = this.get('id');
    // 如果未设置 container 使用 ID, 兼容 2.x 版本
    if (!container && id) {
      container = id;
      this.set('container', id);
    }
    let width = this.get('width');
    const height = this.get('height');
    if (Util.isString(container)) {
      //获取到页面的view
      container = document.getElementById(container);
      if (!container) { // -- 必须配置
        throw new Error('Please specify the container for the chart!');
      }
      this.set('container', container);
    }
    const wrapperEl = DomUtil.createDom('<div style="position:relative;"></div>');
    //container节点中添加wrapper dom
    container.appendChild(wrapperEl);
    this.set('wrapperEl', wrapperEl);
    if (this.get('forceFit')) {//强制跟随宽度缩放
      width = DomUtil.getWidth(container, width);
      this.set('width', width);
    }
    const renderer = this.get('renderer');
    //新new canvas
    const canvas = new Canvas({
      containerDOM: wrapperEl,
      width,
      height,
      // NOTICE: 有问题找青湳
      pixelRatio: renderer === 'svg' ? 1 : this.get('pixelRatio'),
      renderer // 渲染的方式 canvas ? svg ?
    });
    this.set('canvas', canvas);
  }

  // 初始化绘图区间
  _initPlot() {
    const self = this;
    self._initPlotBack(); // 最底层的是背景相关的 group
    const canvas = self.get('canvas');
    const backPlot = canvas.addGroup({
      zIndex: 1
    }); // 图表最后面的容器
    const plotContainer = canvas.addGroup({
      zIndex: 0
    }); // 图表所在的容器
    const frontPlot = canvas.addGroup({
      zIndex: 3
    }); // 图表前面的容器

    //TODO 这里设置的zIndex貌似和官网描述不符合
    self.set('backPlot', backPlot);//最下层 canvas，坐标轴 axis 和 line image rect arc 这四种类型的辅助标记 guide 在这一层绘制
    self.set('middlePlot', plotContainer);//中间层，绘制图表的主体内容几何标记 geom
    self.set('frontPlot', frontPlot);//最上层 canvas，图例 legend、提示信息 tooltip、和 text tag html 这三种类型的辅助标记 guide 在这一层绘制
  }

  // 初始化背景
  _initPlotBack() {
    const self = this;
    const canvas = self.get('canvas');
    const viewTheme = self.get('viewTheme');

    const plot = canvas.addGroup(Plot, {
      padding: this.get('padding'),
      plotBackground: Util.mix({}, viewTheme.plotBackground, self.get('plotBackground')),
      background: Util.mix({}, viewTheme.background, self.get('background'))
    });
    self.set('plot', plot);
    self.set('plotRange', plot.get('plotRange'));
  }

  _initEvents() {
    if (this.get('forceFit')) {
      //监听window的resize事件，事件由工具wrapBehavior传递给 _initForceFitEvent 处理
      window.addEventListener('resize', Util.wrapBehavior(this, '_initForceFitEvent'));
    }
  }

  _initForceFitEvent() {
    //200ms刷新当前的宽高度
    const timer = setTimeout(Util.wrapBehavior(this, 'forceFit'), 200);
    clearTimeout(this.get('resizeTimer'));
    this.set('resizeTimer', timer);
  }

  // 绘制图例
  _renderLegends() {
    const options = this.get('options');
    const legendOptions = options.legends;
    if (Util.isNil(legendOptions) || (legendOptions !== false)) { // 没有关闭图例
      const legendController = this.get('legendController');
      legendController.options = legendOptions || {};
      legendController.plotRange = this.get('plotRange');

      if (legendOptions && legendOptions.custom) { // 用户自定义图例
        legendController.addCustomLegend();
      } else {
        const geoms = this.getAllGeoms();
        const scales = [];
        Util.each(geoms, geom => {
          const view = geom.get('view');
          //['color', 'shape', 'size'] 其中的值
          const attrs = geom.getAttrsForLegend();
          Util.each(attrs, attr => {
            const type = attr.type;
            const scale = attr.getScale(type);
            //图例相关的配置 -- 度量?
            if (scale.field && scale.type !== 'identity' && !_isScaleExist(scales, scale)) {
              scales.push(scale);
              const filteredValues = view.getFilteredOutValues(scale.field);
              legendController.addLegend(scale, attr, geom, filteredValues);
            }
          });
        });

        // 双轴的情况
        const yScales = this.getYScales();
        if (scales.length === 0 && yScales.length > 1) {
          legendController.addMixedLegend(yScales, geoms);
        }

      }

      legendController.alignLegends();
    }
  }

  // 绘制 tooltip
  _renderTooltips() {
    const options = this.get('options');
    if (Util.isNil(options.tooltip) || options.tooltip !== false) { // 用户没有关闭 tooltip
      const tooltipController = this.get('tooltipController');
      tooltipController.options = options.tooltip || {};
      tooltipController.renderTooltip();
    }
  }

  /**
   * 获取所有的几何标记
   * @return {Array} 所有的几何标记
   */
  getAllGeoms() {
    let geoms = [];
    geoms = geoms.concat(this.get('geoms'));

    const views = this.get('views');
    Util.each(views, view => {
      geoms = geoms.concat(view.get('geoms'));
    });

    return geoms;
  }

  /**
   * 自适应宽度
   * @chainable
   * @return {Chart} 图表对象
   */
  forceFit() {
    const self = this;
    if (!self || self.destroyed) {
      return;
    }
    const container = self.get('container');
    const oldWidth = self.get('width');
    const width = DomUtil.getWidth(container, oldWidth);
    if (width !== 0 && width !== oldWidth) {
      const height = self.get('height');
      self.changeSize(width, height);
    }
    return self;
  }

  resetPlot() {
    const plot = this.get('plot');
    const padding = this.get('padding');
    if (!isEqualArray(padding, plot.get('padding'))) {
      // 重置 padding，仅当padding 发生更改
      plot.set('padding', padding);
      plot.repaint();
    }
  }

  /**
   * 改变大小
   * @param  {Number} width  图表宽度
   * @param  {Number} height 图表高度
   * @return {Chart} 图表对象
   */
  changeSize(width, height) {
    const self = this;
    const canvas = self.get('canvas');
    canvas.changeSize(width, height);
    const plot = this.get('plot');
    self.set('width', width);
    self.set('height', height);
    // change size 时重新计算边框
    plot.repaint();
    // 保持边框不变，防止自动 padding 时绘制多遍
    this.set('keepPadding', true);
    self.repaint();
    this.set('keepPadding', false);
    this.emit('afterchangesize');
    return self;
  }
  /**
   * 改变宽度
   * @param  {Number} width  图表宽度
   * @return {Chart} 图表对象
   */
  changeWidth(width) {
    return this.changeSize(width, this.get('height'));
  }
  /**
   * 改变宽度
   * @param  {Number} height  图表高度
   * @return {Chart} 图表对象
   */
  changeHeight(height) {
    return this.changeSize(this.get('width'), height);
  }

  /**
   * 创建一个子视图
   * @param  {Object} cfg 视图的配置项
   * @return {View} 视图对象
   */
  view(cfg) {
    cfg = cfg || {};
    cfg.theme = this.get('theme');
    cfg.parent = this;
    cfg.backPlot = this.get('backPlot');
    cfg.middlePlot = this.get('middlePlot');//绘制 geoms
    cfg.frontPlot = this.get('frontPlot');
    cfg.canvas = this.get('canvas');
    if (Util.isNil(cfg.animate)) {
      cfg.animate = this.get('animate');
    }
    //新cfg和options中的三个配置混合(scales,coord,axes)
    cfg.options = Util.mix({}, this._getSharedOptions(), cfg.options);
    const view = new View(cfg);
    view.set('_id', 'view' + this.get('views').length); // 标识 ID，防止同用户设定的 id 重名
    this.get('views').push(view);
    //发射add view的事件，参数是view自身组成的对象
    this.emit('addview', { view });
    return view;
  }

  // isShapeInView() {
  //   return true;
  // }

  removeView(view) {
    const views = this.get('views');
    Util.Array.remove(views, view);
    view.destroy();
  }

  _getSharedOptions() {
    const options = this.get('options');
    const sharedOptions = {};
    //将已经定义的options中的 scales coord axes三个字段数据共享给new的view使用
    Util.each([ 'scales', 'coord', 'axes' ], function(name) {
      sharedOptions[name] = Util.cloneDeep(options[name]);
    });
    return sharedOptions;
  }

  /**
   * @override
   * 当前chart 的范围
   * {
  'start': {'x':100,'y':320}, // 绘图区域起始点坐标，可以理解为坐标系原点
  'end': {'x':720,'y':40}, // 绘图区域结束点坐标
  'tl': {'x':100,'y':40}, // 绘图区域左上角点坐标，top-left
  'tr': {'x':720,'y':40}, // 绘图区域右上角点坐标，top-right
  'bl': {'x':100,'y':320}, // 绘图区域左下角点坐标，bottom-left
  'br': {'x':720,'y':320}, // 绘图区域右下角点坐标，bottom-right
  'cc': {'x':410,'y':180} // 绘图区域中心店坐标
}
   */
  getViewRegion() {
    const plotRange = this.get('plotRange');
    return {
      start: plotRange.bl,
      end: plotRange.tr
    };
  }

  /**
   * 设置图例配置信息
   * @param  {String|Object} field 字段名
   * @param  {Object} [cfg] 图例的配置项
   * @return {Chart} 当前的图表对象
   */
  legend(field, cfg) {
    const options = this.get('options');
    if (!options.legends) {//先去options看是否有值
      options.legends = {};//初始化
    }

    let legends = {};
    if (field === false) {//不展示图例
      options.legends = false;
    } else if (Util.isObject(field)) {//直接就是对象，表示配置信息
      legends = field;
    } else if (Util.isString(field)) {// 设置字段名上的图例配置
      legends[field] = cfg;
    } else {
      legends = cfg;
    }
    //对象混合
    Util.mix(options.legends, legends);

    return this;
  }

  /**
   * 设置提示信息
   * @param  {String|Object} visible 是否可见
   * @param  {Object} [cfg] 提示信息的配置项
   * @return {Chart} 当前的图表对象
   */
  tooltip(visible, cfg) {
    const options = this.get('options');
    if (!options.tooltip) {
      options.tooltip = {};
    }

    if (visible === false) {//配置不可见
      options.tooltip = false;
    } else if (Util.isObject(visible)) {//对象代表是config
      Util.mix(options.tooltip, visible);
    } else {//其他情况都是config
      Util.mix(options.tooltip, cfg);
    }

    return this;
  }

  /**
   * 清空图表
   * @return {Chart} 当前的图表对象
   */
  clear() {
    this.emit('beforeclear');
    const views = this.get('views');
    while (views.length > 0) {
      const view = views.shift();
      view.destroy();
    }
    super.clear();
    const canvas = this.get('canvas');
    this.resetPlot();
    canvas.draw();
    this.emit('afterclear');
    return this;
  }

  clearInner() {
    const views = this.get('views');
    Util.each(views, function(view) {
      view.clearInner();
    });

    const tooltipController = this.get('tooltipController');
    tooltipController && tooltipController.clear();

    if (!this.get('keepLegend')) {
      const legendController = this.get('legendController');
      legendController && legendController.clear();
    }

    super.clearInner();
  }

  // chart 除了view 上绘制的组件外，还会绘制图例和 tooltip
  /**
   * chart#drawComponents -> view#drawComponents ->render axes&guide
   */
  drawComponents() {
    super.drawComponents();
    // 一般是点击图例时，仅仅隐藏某些选项，而不销毁图例
    if (!this.get('keepLegend')) {
      this._renderLegends(); // 渲染图例
    }
  }

  /**
   * 绘制图表
   * @override
   */
  render() {
    const self = this;
    // 需要自动计算边框，则重新设置 -- 当repaint后 keepPadding为false
    if (!self.get('keepPadding') && self._isAutoPadding()) {
      self.beforeRender(); // 初始化各个 view 和 绘制
      //除view以外的所有组件
      self.drawComponents();
      const autoPadding = self._getAutoPadding();
      const plot = self.get('plot');
      // 在计算出来的边框不一致的情况，重新改变边框
      if (!isEqualArray(plot.get('padding'), autoPadding)) {
        plot.set('padding', autoPadding);
        plot.repaint();
      }
    }
    //图例绘制层
    const middlePlot = self.get('middlePlot');
    if (self.get('limitInPlot') && !middlePlot.attr('clip')) {
      const clip = Util.getClipByRange(self.get('plotRange')); // TODO Polar coord
      middlePlot.attr('clip', clip);
      // clip.attr('fill', 'grey');
      // clip.attr('opacity', 0.5);
      // middlePlot.add(clip);
    }
    super.render();
    self._renderTooltips(); // 渲染 tooltip
  }

  repaint() {
    // 重绘时需要判定当前的 padding 是否发生过改变，如果发生过改变进行调整
    // 需要判定是否使用了自动 padding
    if (!this.get('keepPadding')) {
      this.resetPlot();
    }
    super.repaint();
  }

  /**
   * @override
   * 显示或者隐藏
   */
  changeVisible(visible) {
    const wrapperEl = this.get('wrapperEl');
    const visibleStr = visible ? '' : 'none';
    wrapperEl.style.display = visibleStr;
  }

  /**
   * 返回图表的 dataUrl 用于生成图片
   * @return {String} dataUrl 路径
   */
  toDataURL() {
    const chart = this;
    const canvas = chart.get('canvas');
    const renderer = chart.get('renderer');
    const canvasDom = canvas.get('el');
    let dataURL = '';
    if (renderer === 'svg') {
      const clone = canvasDom.cloneNode(true);
      const svgDocType = document.implementation.createDocumentType(
        'svg', '-//W3C//DTD SVG 1.1//EN', 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'
      );
      const svgDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', svgDocType);
      svgDoc.replaceChild(clone, svgDoc.documentElement);
      const svgData = (new XMLSerializer()).serializeToString(svgDoc);
      dataURL = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svgData);
    } else if (renderer === 'canvas') {
      dataURL = canvasDom.toDataURL('image/png');
    }
    return dataURL;
  }

  /**
   * 图表导出功能
   * @param  {String} [name] 图片的名称，默认为 chart(.png|.svg)
   */
  downloadImage(name) {
    const chart = this;
    const link = document.createElement('a');
    const renderer = chart.get('renderer');
    const filename = (name || 'chart') + (renderer === 'svg' ? '.svg' : '.png');
    const canvas = chart.get('canvas');
    canvas.get('timeline').stopAllAnimations();

    setTimeout(() => {
      const dataURL = chart.toDataURL();
      if (window.Blob && window.URL && renderer !== 'svg') {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blobObj = new Blob([ u8arr ], { type: mime });
        if (window.navigator.msSaveBlob) {
          window.navigator.msSaveBlob(blobObj, filename);
        } else {
          link.addEventListener('click', function() {
            link.download = filename;
            link.href = window.URL.createObjectURL(blobObj);
          });
        }
      } else {
        link.addEventListener('click', function() {
          link.download = filename;
          link.href = dataURL;
        });
      }
      const e = document.createEvent('MouseEvents');
      e.initEvent('click', false, false);
      link.dispatchEvent(e);
    }, 16);
  }

  /**
   * 根据坐标点显示对应的 tooltip
   * @param  {Object} point 画布上的点
   * @return {Chart}       返回 chart 实例
   */
  showTooltip(point) {
    const views = this.getViewsByPoint(point);
    if (views.length) {
      const tooltipController = this.get('tooltipController');
      tooltipController.showTooltip(point, views);
    }
    return this;
  }

  /**
   * 隐藏 tooltip
  * @return {Chart}       返回 chart 实例
   */
  hideTooltip() {
    const tooltipController = this.get('tooltipController');
    tooltipController.hideTooltip();
    return this;
  }

  /**
   * 根据传入的画布坐标，获取该处的 tooltip 上的记录信息
   * @param  {Object} point 画布坐标点
   * @return {Array}       返回结果
   */
  getTooltipItems(point) {
    const self = this;
    const views = self.getViewsByPoint(point);
    let rst = [];
    Util.each(views, view => {
      const geoms = view.get('geoms');
      Util.each(geoms, geom => {
        const dataArray = geom.get('dataArray');
        let items = [];
        Util.each(dataArray, data => {
          const tmpPoint = geom.findPoint(point, data);
          if (tmpPoint) {
            const subItems = geom.getTipItems(tmpPoint);
            items = items.concat(subItems);
          }
        });
        rst = rst.concat(items);
      });
    });
    return rst;
  }

  /**
   * @override
   * 销毁图表
   */
  destroy() {
    this.emit('beforedestroy');
    clearTimeout(this.get('resizeTimer'));
    const canvas = this.get('canvas');
    const wrapperEl = this.get('wrapperEl');
    wrapperEl.parentNode.removeChild(wrapperEl);
    super.destroy();
    canvas.destroy();
    window.removeEventListener('resize', Util.getWrapBehavior(this, '_initForceFitEvent'));
    this.emit('afterdestroy');
  }
}

module.exports = Chart;
