const superagent = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');

const url = 'http://zdg.meilianji.cn/zhdg/index.php';

(function() {
  for (let index = 1; index <= 51; index++) {
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
      r: 'user/main',
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

function insertSqlFromJson(postlist) {
  pool.getConnection(function(err, connection) {
    console.log(postlist);
    var gdata = postlist;
    var myquery;
    for (var i = 0; i < gdata.length; i++) {
      myquery =
        "INSERT INTO in_users (`id`,`nikename`,`username`,`sex`,`integral`, `phone`,`image`,`code`,`invitees`,`createDate`)VALUES ( '" +
        gdata[i].id +
        "', '" +
        gdata[i].nikename +
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
      nikename: elem
        .find('td')
        .eq(4)
        .text()
        .trim(),
      username: elem
        .find('td')
        .eq(5)
        .text()
        .trim(),
      sex: elem
        .find('td')
        .eq(7)
        .text()
        .trim(),
      integral: elem
        .find('td')
        .eq(9)
        .text()
        .trim(),
      phone: elem
        .find('td')
        .eq(11)
        .text()
        .trim(),
      image: elem
        .find('td')
        .eq(13)
        .find('img')
        .attr('src')
        .trim(),
      code: elem
        .find('td')
        .eq(15)
        .text()
        .trim(),
      invitees: elem
        .find('td')
        .eq(16)
        .find('a')
        .text()
        .trim(),
      createDate: elem
        .find('td')
        .eq(17)
        .text()
        .trim()
    };
    postList.push(post);
  });
  return postList;
}
