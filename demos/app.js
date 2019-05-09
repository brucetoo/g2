process.env.DEBUG = 'app:*';
/**
 * 往Node环境中注入 DEBUG 变量
 * 此变量使用了通配符，配合下方node debug模块做调试用的
 * 可以再此去看具体说明 https://www.jianshu.com/p/6b9833748f36
 * https://juejin.im/post/58fe94e55c497d00580ca7c5
 * mac中的运行方式（命名空间为app:*）
 * DEBUG=app:* node demos/app.js
 */
const debug = require('debug')('app:demos');
/**
 * commander.js是TJ所写的一个工具包，其作用是让node命令行程序的制作更加简单
 * http://blog.gejiawen.com/2016/09/21/make-a-node-cli-program-by-commander-js/
 * https://aotu.io/notes/2015/12/23/building-command-line-tools-with-node-js/
 */
const commander = require('commander');
/**
 * Connect 中间件就是 JavaScript 函数。函数一般有三个参数：
 req（请求对象）
 res（响应对象）
 next（回调函数）
 一个中间件完成自己的工作后，如果要执行后续的中间件，需要调用 next 回调函数
 借助中间件 API，可以把一些小的功能组合到一起，实现复杂的处理逻辑。
 */
const connect = require('connect');
/**
 * 获取端口的一个工具  "get-port": "~3.2.0",
 */
const getPort = require('get-port');
/**
 * node提供的核心http模块(直接require即可)
 * http.createServer(function(req,res){ //创建了一个服务器对象
    res.writeHead(200,{
        "content-type":"text/plain"
    }); // 第一个参数表示HTTP的响应状态（200）；第二个参数是“Content-Type”，表示我响应给客户端的内容类型
    res.write("hello world"); //传递给客户端的内容
    res.end(); //标记请求已处理完成
}).listen(3000); //第一个参数表示监听的端口号，第二个参数是callback,监听开启后立刻触发
 */
const http = require('http');
/**
 * 可以指定在某个浏览器下打开url链接
 * open('url','chrome(浏览器名字)')
 */
const open = require('open');
/**
 * Node中的静态服务器实现
 * https://juejin.im/post/5a9660fe6fb9a0634b4da9ae
 */
const serveStatic = require('serve-static');
/**
 * https://github.com/pillarjs/parseurl
 * Parse the URL of the given request object (looks at the req.url property) and return the result.
 * The result is the same as url.parse in Node.js core.
 * Calling this function multiple times on the same req where req.url does not change will return a cached parsed object,
 * rather than parsing again.
 */
const parseurl = require('parseurl');
/**
 * 通过使用数组，数字，对象，字符串等方法, lodash使JavaScript变得更简单。
 * https://www.jianshu.com/p/d46abfa4ddc9
 */
const assign = require('lodash').assign;
/**
 * Node的path模块
 */
const path = require('path');
const resolve = path.resolve;
const extname = path.extname;
const basename = path.basename;
const join = path.join;

// node文件模块
const fs = require('fs');
const statSync = fs.statSync;// 读取文件相关信息
const lstatSync = fs.lstatSync;// 读取文件相关信息
const readdirSync = fs.readdirSync;// 读取文件目录
const readFileSync = fs.readFileSync;// 读取文件操作
const mkdirSync = fs.mkdirSync;// 创建目录

/**
 * 模板引擎,基于模板配合数据构造出字符串输出的一个组件
 * https://www.liaoxuefeng.com/wiki/1022910821149312/1100400176397024
 */
const nunjucks = require('nunjucks');
const renderString = nunjucks.renderString;

const pkg = require('../package.json');

function isFile(source) {
  return lstatSync(source).isFile();
}

function getFiles(source) {
  return readdirSync(source).map(function(name) {
    // 文件加入到整体路径中 绝对路径/filename.ext
    return join(source, name);
  }).filter(isFile); // 返回一个数组
}

const screenshotsPath = join(process.cwd(), './demos/assets/screenshots');
try {
  statSync(screenshotsPath);
} catch (e) {
  mkdirSync(screenshotsPath);
}

// 定义一个命名行工具，具体的使用地点在 package.json demos-web脚本中
commander
  .version(pkg.version)
  .option('-w, --web')
  .option('-p, --port <port>', 'specify a port number to run on', parseInt)
  .parse(process.argv);

function startService(port) {
  const server = connect();
  server.use((req, res, next) => {
    if (req.method === 'GET') {
      // 从请求中提取出url  req.url
      const pathname = parseurl(req).pathname;
      if (pathname === '/demos/index.html') {
        console.log('__dirname:' + __dirname);
        console.log('process.cwd():' + process.cwd());
        const demoFiles = getFiles(__dirname)
          .filter(filename => { // html结尾文件
            return extname(filename) === '.html';
          })
          .map(filename => {
            // 去除掉文件路径后面的.html后缀 /a/ab/c.html => c
            const bn = basename(filename, '.html');
            const file = {
              screenshot: `/demos/assets/screenshots/${bn}.png`,
              basename: bn, // 文件名
              content: readFileSync(filename),
              filename
            };
            return file; // 返回file对象的数组
          });
        const template = readFileSync(join(__dirname, './index.njk'), 'utf8');
        // 渲染模板是 index.njk 形式、然后数据格式是 上述的file类型，如上几个值
        res.end(renderString(template, {
          demoFiles
        }));
      } else { // 请求的地址的pathname 非 demos/index.html
        next();
      }
    } else { // 非get请求
      next();
    }
  });
  // 创建一个静态资源处理服务器
  server.use(serveStatic(process.cwd()));
  // 用server中间件创建一个本地服务器
  http.createServer(server).listen(port);

  const url = `http://127.0.0.1:${port}/demos/index.html`;
  debug(`server started, demos available! ${url}`);

  // 启动命名行中有配置 --web
  if (commander.web) {
    debug('running on web!');
    open(url);
  } else {
    debug('running on electron!');
    const app = require('electron').app;
    const BrowserWindow = require('electron').BrowserWindow;
    const watch = require('torchjs/lib/watch');
    const windowBoundsConfig = require('torchjs/lib/windowBoundsConfig')(
      resolve(app.getPath('userData'), './g2-demos-config.json')
    );

    let win;
    app.once('ready', () => {
      win = new BrowserWindow(assign({
        // transparent: true
        webPreferences: {
          nodeIntegration: false
        }
      }, windowBoundsConfig.get('demos')));
      win.loadURL(url);
      win.openDevTools();

      win.on('close', () => {
        windowBoundsConfig.set('demos', win.getBounds());
      });
      win.on('closed', () => {
        win = null;
      });
      watch([
        'demos/**/*.*',
        'src/**/*.*'
      ], () => {
        win.webContents.reloadIgnoringCache();
      });
    });
    app.on('window-all-closed', () => {
      app.quit();
    });
  }
}

// 如果命名行有配置port端口
if (commander.port) {
  startService(commander.port);
} else {
  getPort().then(port => {
    startService(port);
  });
}
