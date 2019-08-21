/**
 *   爬取部门信息
 */
const superagent = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');

const url = 'http://zdg.meilianji.cn/zhdg/index.php';

(function() {
  for (let index = 1; index <= 4; index++) {
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

function WapperSuperAgent(index) {
  superagent
    .get(url)
    .set('Cookie', 'PHPSESSID=f6n3hjtjkicbu79hkdon5tkgp3')
    .query({
      r: 'basic_level_town/main',
      type: 2,
      page: index
    })
    .end((err, res) => {
      if (err) throw Error(err);
      let postlist = getFilterHtml(res.text);
      // 存入数据库操作...
      postlist.forEach(test => {
        superagent
          .get('http://zdg.meilianji.cn/web/basicLevel/get_town_info.php')
          .set('Cookie', 'PHPSESSID=f6n3hjtjkicbu79hkdon5tkgp3')
          .query({
            town_id: test.town_id
          })
          .end((err, res) => {
            if (err) throw Error(err);
            var result = JSON.parse(res.text);
            result.forEach(element => {
              element.type = 2;
              delete element.pics;
            });
            console.log(result);
            // 存入数据库操作...
            insertSqlFromJson(result);
          });
      });
    });
}

function insertSqlFromJson(postlist) {
  pool.getConnection(function(err, connection) {
    var myquery;
    for (var i = 0; i < postlist.length; i++) {
      myquery =
        "INSERT INTO in_server_towninfo (`if_show`,`town_id`,`town_name`,`pic_uri`,`town_content`, `pics`,`type`)VALUES ( '" +
        postlist[i].if_show +
        "', '" +
        postlist[i].town_id +
        "', '" +
        postlist[i].town_name +
        "', '" +
        postlist[i].pic_uri +
        "', '" +
        postlist[i].town_content +
        "', '" +
        postlist[i].pics +
        "', '" +
        postlist[i].type +
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
  let $ = cheerio.load(html);
  let postList = [];

  $('tbody tr').each((index, item) => {
    let elem = $(item);
    let post = {
      town_id: elem
        .find('td')
        .eq(2)
        .text()
        .trim()
    };
    postList.push(post);
  });
  return postList;
}
