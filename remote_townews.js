const superagent = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');

const url = 'http://zdg.meilianji.cn/zhdg/index.php';

(function() {
  for (let index = 2; index <= 16; index++) {
    WapperSuperAgent(index);
  }
})();

var pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'insert',
  port: 3306
});

function WapperSuperAgent(page) {
  superagent
    .get(url)
    .set('Cookie', 'PHPSESSID=f6n3hjtjkicbu79hkdon5tkgp3')
    .query({
      r: 'basic_level_news/main',
      page: page
    })
    .end((err, res) => {
      if (err) throw Error(err);
      let postlist = getFilterHtml(res.text);
      // 存入数据库操作...
      insertSqlFromJson(postlist);
    });
}

function getFilterHtml(html) {
  //转换
  var len;
  function convertParams(params) {
    console.log(params);
    switch (params) {
      case '南湖镇':
        len = 0;
        break;
      case '西湖镇':
        len = 1;
        break;
      case '三庄镇':
        len = 2;
        break;
      case '日照街道':
        len = 3;
        break;
      case '石臼街道':
        len = 4;
        break;
      case '陈疃镇':
        len = 5;
        break;
      case '涛雒镇':
        len = 6;
        break;
      case '香河街道':
        len = 7;
        break;
      case '秦楼街道':
        len = 8;
        break;
      case '后村镇':
        len = 9;
        break;
      case '河山镇':
        len = 10;
        break;
      default:
        break;
    }
  }
  //转换
  var len2;
  function convertParams2(params) {
    switch (params) {
      case '聚焦':
        len2 = 0;
        break;
      case '遇见':
        len2 = 1;
        break;
      default:
        break;
    }
  }

  let $ = cheerio.load(html);
  let postList = [];

  $('tbody tr').each((index, item) => {
    let elem = $(item);

    getContentFromRemote(
      elem
        .find('td')
        .eq(2)
        .text()
    );

    convertParams(
      elem
        .find('td')
        .eq(3)
        .text()
        .trim()
    );
    convertParams2(
      elem
        .find('td')
        .eq(4)
        .text()
        .trim()
    );

    let post = {
      id: elem
        .find('td')
        .eq(2)
        .text(),
      town_id: len,
      news_type: len2,
      title: elem
        .find('td')
        .eq(5)
        .text()
        .trim(),
      pic_uri: elem
        .find('td')
        .find('.layer-photos1')
        .find('img')
        .attr('src')
        .trim(),
      create_time: elem
        .find('td')
        .eq(11)
        .text()
        .trim()
    };
    postList.push(post);
  });
  return postList;
}

function insertSqlFromJson(postlist) {
  pool.getConnection(function(err, connection) {
    var gdata = postlist;
    var myquery;
    for (var i = 0; i < gdata.length; i++) {
      myquery =
        "INSERT INTO in_server_townews (`id`,`town_id`,`news_type`,`title`, `pic_uri`,`create_time`)VALUES ( '" +
        gdata[i].id +
        "', '" +
        gdata[i].town_id +
        "', '" +
        gdata[i].news_type +
        "', '" +
        gdata[i].title +
        "', '" +
        gdata[i].pic_uri +
        "', '" +
        gdata[i].create_time +
        "' );";

      connection.query(myquery, function(err, result) {
        if (result) {
          result = {
            code: 200,
            msg: '增加成功'
          };
        } else {
          result = { status: 0, msg: err };
        }
      });
    }
    // 释放连接
    connection.release();
  });
}

function getContentFromRemote(params) {
  superagent
    .get('http://zdg.meilianji.cn/web/basicLevel/get_town_news_content.php')
    .query({
      news_id: params
    })
    .end((err, res) => {
      if (err) throw Error(err);
      var content = JSON.parse(res.text)[0];
      content.id = params;
      console.log(content);
      insertSqlFromObject(content);
    });
}

function insertSqlFromObject(content) {
  pool.getConnection(function(err, connection) {
    var gdata = content;
    var myquery;
    myquery =
      "INSERT INTO in_server_towncontent (`id`,`create_date`,`title`,`content`)VALUES ( '" +
      gdata.id +
      "', '" +
      gdata.create_date +
      "', '" +
      gdata.title +
      "', '" +
      gdata.content +
      "' );";

    connection.query(myquery, function(err, result) {
      if (result) {
        result = {
          code: 200,
          msg: '增加成功'
        };
      } else {
        result = { status: 0, msg: err };
      }
    });
    // 释放连接
    connection.release();
  });
}
