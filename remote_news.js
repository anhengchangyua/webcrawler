const superagent = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');

const url = 'http://zdg.meilianji.cn/zhdg/index.php';

(function() {
  //   for (let index = 701; index <= 718; index++) {
  WapperSuperAgent(1);
  //   }
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
    .set('Cookie', 'PHPSESSID=cpscrltdvpab886259s1ec4c50')
    .query({
      r: 'news/main',
      page: page
    })
    .end((err, res) => {
      if (err) throw Error(err);
      let postlist = getFilterHtml(res.text);
      // 存入数据库操作...
      console.log(postlist);
      // insertSqlFromJson(postlist);
    });
}

function insertSqlFromJson(postlist) {
  pool.getConnection(function(err, connection) {
    console.log(postlist);
    var gdata = postlist;
    var myquery;
    for (var i = 0; i < gdata.length; i++) {
      myquery =
        "INSERT INTO users (`id`,`is_check`,`username`,`sex`,`integral`, `phone`,`image`,`code`,`invitees`,`createDate`)VALUES ( '" +
        gdata[i].id +
        "', '" +
        gdata[i].is_check +
        "', '" +
        gdata[i].username +
        "', '" +
        gdata[i].sex +
        "', '" +
        gdata[i].integral +
        "', '" +
        gdata[i].phone +
        "', '" +
        gdata[i].image +
        "', '" +
        gdata[i].code +
        "', '" +
        gdata[i].invitees +
        "', '" +
        gdata[i].createDate +
        "' );";

      connection.query(myquery, function(err, result) {
        if (result) {
          result = {
            code: 200,
            msg: '增加成功'
          };
        } else {
          result = { status: 0, msg: err };
          console.log(result);
        }
      });
    }
    // 释放连接
    connection.release();
  });
}

function getFilterHtml(html) {
  var len;
  function convertParams(params) {
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
