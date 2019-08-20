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
    .set('Cookie', 'PHPSESSID=4u3tq56oac2bnrud9d1gi6rlb5')
    .query({
      r: 'news_comment/main1',
      page: page
    })
    .end((err, res) => {
      if (err) throw Error(err);
      let postlist = getFilterHtml(res.text);
      // 存入数据库操作...
      console.log(postlist);
      //   insertSqlFromJson(postlist);
    });
}

function getFilterHtml(html) {
  let $ = cheerio.load(html);
  let postList = [];

  $('tbody tr').each((index, item) => {
    let elem = $(item);

    function converToUserId(params) {
      var regex = params.match(/[0-9]{1,11}$/);
      pool.getConnection(function(err, connection) {
        var myquery = 'SELECT id from in_users where phone =' + regex[0];
        connection.query(myquery, function(err, result) {
          if (result) {
            return result[0].id;
          } else {
            result = { status: 0, msg: err };
          }
        });
        // 释放连接
        connection.release();
      });
    }

    let post = {
      id: elem
        .find('td')
        .eq(2)
        .text()
        .trim(),

      is_check:
        elem
          .find('td')
          .eq(3)
          .text()
          .trim() == '审核通过'
          ? 1
          : 0,

      user_id: converToUserId(
        elem
          .find('td')
          .eq(4)
          .text()
          .trim()
      ),

      news_id: elem
        .find('td')
        .eq(5)
        .text()
        .trim(),

      title: elem
        .find('td')
        .eq(6)
        .text()
        .trim(),

      like_number: elem
        .find('td')
        .eq(7)
        .text()
        .trim(),

      content: elem
        .find('td')
        .eq(8)
        .text()
        .trim(),

      comment_time: elem
        .find('td')
        .eq(9)
        .text()
        .trim()
    };
    postList.push(post);
  });
  return postList;
}

function insertSqlFromJson(postlist) {
  pool.getConnection(function(err, connection) {
    console.log(postlist);
    var gdata = postlist;
    var myquery;
    for (var i = 0; i < gdata.length; i++) {
      myquery =
        "INSERT INTO in_home_newscomment (`id`,`is_check`,`user_id`,`news_id`,`title`, `like_number`,`content`,`comment_time`)VALUES ( '" +
        gdata[i].id +
        "', '" +
        gdata[i].is_check +
        "', '" +
        gdata[i].user_id +
        "', '" +
        gdata[i].news_id +
        "', '" +
        gdata[i].title +
        "', '" +
        gdata[i].like_number +
        "', '" +
        gdata[i].content +
        "', '" +
        gdata[i].comment_time +
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
