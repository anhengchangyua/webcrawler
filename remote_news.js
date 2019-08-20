const superagent = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');

const url = 'http://zdg.meilianji.cn/zhdg/index.php';

(function() {
  for (let index = 101; index <= 150; index++) {
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
    .set('Cookie', 'PHPSESSID=4u3tq56oac2bnrud9d1gi6rlb5')
    .query({
      r: 'news/main',
      page: page
    })
    .end((err, res) => {
      if (err) throw Error(err);
      let postlist = getFilterHtml(res.text);
      // 存入数据库操作...
      console.log(postlist);
      insertSqlFromJson(postlist);
    });
}

function getFilterHtml(html) {
  //转换
  var len;
  function convertParams(params) {
    console.log(params);
    switch (params) {
      case '新闻':
        len = 0;
        break;
      case '乐活':
        len = 1;
        break;
      case '专题':
        len = 2;
        break;
      case '通知公告':
        len = 3;
        break;
      case '直播':
        len = 4;
        break;
      default:
        break;
    }
  }
  //转换
  var len2;
  function convertParams2(params) {
    switch (params) {
      case '新闻 · 缩略图':
        len2 = 0;
        break;
      case '新闻 · 组图':
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
        .eq(5)
        .text()
        .trim()
    );
    convertParams2(
      elem
        .find('td')
        .eq(9)
        .text()
        .trim()
    );

    let post = {
      id: elem
        .find('td')
        .eq(2)
        .text(),
      is_check:
        elem
          .find('td')
          .eq(3)
          .text()
          .trim() == '审核通过'
          ? 1
          : 0,
      is_top:
        elem
          .find('td')
          .eq(4)
          .text()
          .trim() == '已置顶'
          ? 1
          : 0,
      type_id: len,
      title: elem
        .find('td')
        .eq(6)
        .find('a')
        .attr('title')
        .trim(),
      click_volume: elem
        .find('td')
        .eq(7)
        .text()
        .trim(),
      display_method: len2,
      pic_uri: elem
        .find('td')
        .find('.layer-photos1')
        .find('img')
        .attr('src')
        .trim(),
      release_time: elem
        .find('td')
        .eq(11)
        .text()
        .trim(),
      create_time: elem
        .find('td')
        .eq(12)
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
        "INSERT INTO in_home_newsinfo (`id`,`is_check`,`is_top`,`type_id`,`title`, `click_volume`,`display_method`,`pic_uri`,`release_time`,`create_time`)VALUES ( '" +
        gdata[i].id +
        "', '" +
        gdata[i].is_check +
        "', '" +
        gdata[i].is_top +
        "', '" +
        gdata[i].type_id +
        "', '" +
        gdata[i].title +
        "', '" +
        gdata[i].click_volume +
        "', '" +
        gdata[i].display_method +
        "', '" +
        gdata[i].pic_uri +
        "', '" +
        gdata[i].release_time +
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
    .get('http://zdg.meilianji.cn/web/news/get_news_detail_content.php')
    .query({
      news_id: params
    })
    .end((err, res) => {
      if (err) throw Error(err);
      var content = JSON.parse(res.text)[0];
      content.id = params;
      insertSqlFromObject(content);
    });
}

function insertSqlFromObject(content) {
  pool.getConnection(function(err, connection) {
    var gdata = content;
    var myquery;
    myquery =
      "INSERT INTO in_home_newscontent (`id`,`news_content`,`news_title`,`tittle_colour`,`tittle_size`, `create_date`,`author`)VALUES ( '" +
      gdata.id +
      "', '" +
      gdata.news_content +
      "', '" +
      gdata.news_title +
      "', '" +
      gdata.tittle_colour +
      "', '" +
      gdata.tittle_size +
      "', '" +
      gdata.create_date +
      "', '" +
      gdata.author +
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
