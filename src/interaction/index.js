/**
 * @fileOverview Interaction
 * @author leungwensen@gmail.com
 */
const G2 = require('../core');
const Chart = require('../chart/chart');
/**
 * 工具集，包含了antv和lodash相关工具库
 */
const Util = require('../util');

const Interactions = {
  Base: require('./base'),
  Brush: require('./brush'),
  Drag: require('./drag'),
  ScrollBar: require('./scroll-bar'),
  ShapeSelect: require('./shape-select'),
  Slider: require('./slider'),
  Zoom: require('./zoom')
};

//g2内部的interactions
G2._Interactions = {};
G2.registerInteraction = function(type, constructor) {
  G2._Interactions[type] = constructor;
};
G2.getInteraction = function(type) {
  return G2._Interactions[type];
};

// binding on View 将所有的interaction注册到prototype
Chart.prototype.getInteractions = function() {
  const me = this;
  if (!me._interactions) {
    me._interactions = {};
  }
  return me._interactions;
};
Chart.prototype._setInteraction = function(type, interaction) {
  const me = this;
  const interactions = me.getInteractions();
  //类型存在，且和原本的interaction不相同~~~ 保证存放的是唯一的kv
  if (interactions[type] && interactions[type] !== interaction) { // only one interaction for a key
    interactions[type].destroy();//每个interaction都有一个destroy方法
  }
  interactions[type] = interaction;
};

//清理interaction操作
Chart.prototype.clearInteraction = function(type) {
  const me = this;
  const interactions = me.getInteractions();
  if (type) {//type不同空 就是true
    if (interactions[type]) { //通过type找到并且对应的interaction
      interactions[type]._reset();
      interactions[type].destroy();
    }
    delete interactions[type];//将此type的值从Interactions对象中移除
  } else { //type不传的话，默认是情况所有的interaction
    Util.each(interactions, (interaction, key) => {
      interaction._reset();
      interaction.destroy();
      delete interactions[key];
    });
  }
};

//自定义一个交互（主要是对某个type设置对于的config），类型&config
Chart.prototype.interact = Chart.prototype.interaction = function(type, cfg) {
  const me = this;
  const Ctor = G2.getInteraction(type);
  const interaction = new Ctor(cfg, me);
  me._setInteraction(type, interaction);
  return me;
};

G2.registerInteraction('brush', Interactions.Brush);
G2.registerInteraction('Brush', Interactions.Brush);
G2.registerInteraction('drag', Interactions.Drag);
G2.registerInteraction('Drag', Interactions.Drag);
G2.registerInteraction('zoom', Interactions.Zoom);
G2.registerInteraction('Zoom', Interactions.Zoom);
G2.registerInteraction('scroll-bar', Interactions.ScrollBar);
G2.registerInteraction('ScrollBar', Interactions.ScrollBar);
G2.registerInteraction('shape-select', Interactions.ShapeSelect);
G2.registerInteraction('ShapeSelect', Interactions.ShapeSelect);
G2.registerInteraction('slider', Interactions.Slider);
G2.registerInteraction('Slider', Interactions.Slider);

module.exports = Interactions;
