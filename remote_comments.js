const superagent = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');

const url = 'http://zdg.meilianji.cn/zhdg/index.php';

(function() {
  for (let index = 201; index <= 228; index++) {
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
      r: 'news_comment/main1',
      page: page
    })
    .end((err, res) => {
      if (err) throw Error(err);
      let postlist = getFilterHtml(res.text);
      // 存入数据库操作...
      insertSqlFromJson(postlist);
    });
}

function converToUserId(params) {
  params.forEach(element => {
    var regex = element.user_info.match(/[0-9]{1,11}$/);
    pool.getConnection(function(err, connection) {
      var myquery = 'SELECT id from in_users where phone =' + regex[0];
      connection.query(myquery, function(err, result) {
        if (result) {
          var iditem = {
            user_id: result[0].id
          };
          myquery =
            'UPDATE in_home_newscomment  SET user_id = ? where user_info = ?';
          connection.query(
            myquery,
            [iditem.user_id, element.user_info],
            function(err, result) {
              if (result) {
                result = {
                  code: 200,
                  msg: '增加成功'
                };
                console.log(result);
              } else {
                result = { status: 0, msg: err };
                console.log(result);
              }
            }
          );
        } else {
          result = { status: 0, msg: err };
        }
      });
      // 释放连接
      connection.release();
    });
  });
}

function getFilterHtml(html) {
  let $ = cheerio.load(html);
  let postList = [];

  $('tbody tr').each((index, item) => {
    let elem = $(item);

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

      user_info: elem
        .find('td')
        .eq(4)
        .text()
        .trim(),

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
        "INSERT INTO in_home_newscomment (`id`,`is_check`,`user_info`, `news_id`,`title`, `like_number`,`content`,`comment_time`)VALUES ( '" +
        gdata[i].id +
        "', '" +
        gdata[i].is_check +
        "', '" +
        gdata[i].user_info +
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
        } else {
          result = { status: 0, msg: err };
        }
      });
    }
    converToUserId(gdata);
    // 释放连接
    connection.release();
  });
}
