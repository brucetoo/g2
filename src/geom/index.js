
const Geom = require('./base');
//点图
Geom.Point = require('./point');
//扰动点图 -- 避免值在同一点重复覆盖，做相应的左右位移
Geom.PointJitter = Geom.Point.Jitter;
//层叠点图
Geom.PointStack = Geom.Point.Stack;
//路径图(直接收尾相连 无中间点)
Geom.Path = require('./path');
//线图 由点组合成线
Geom.Line = require('./line');
Geom.LineStack = Geom.Line.Stack;
// 区间图 --- 柱状图(默认)、直方图、玫瑰图、饼图、条形环图（玉缺图）、漏斗图
Geom.Interval = require('./interval');
//层叠柱状图
Geom.IntervalStack = Geom.Interval.Stack;
//分组柱状图
Geom.IntervalDodge = Geom.Interval.Dodge;
//对称柱状图
Geom.IntervalSymmetric = Geom.Interval.Symmetric;

//区域图（面积图）、层叠区域图、区间区域图
Geom.Area = require('./area');
//层叠区域图
Geom.AreaStack = Geom.Area.Stack;
//色块图（像素图）、热力图、地图
Geom.Polygon = require('./polygon');
//k线图，箱型图 -- 自定义图表类型
Geom.Schema = require('./schema');
//分组箱型图
Geom.SchemaDodge = Geom.Schema.Dodge;
//树图、流程图、关系图 -- node之间的连接线
Geom.Edge = require('./edge');
//热力图
Geom.Heatmap = require('./heatmap');
//维恩图 -- 图形交叉集
Geom.Venn = require('./venn');
Geom.Violin = require('./violin');

module.exports = Geom;
//关于geom相关的api解释： https://www.yuque.com/antv/g2-docs/api-geom
