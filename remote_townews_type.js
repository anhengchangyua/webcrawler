const superagent = require('superagent');
const cheerio = require('cheerio');
const mysql = require('mysql');

const url = 'http://zdg.meilianji.cn/zhdg/index.php';

(function() {
  for (let index = 2; index <= 17; index++) {
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
      page: page,
      type: 2
    })
    .end((err, res) => {
      if (err) throw Error(err);
      let postlist = getFilterHtml(res.text);
      // 存入数据库操作...
      insertSqlFromJson(postlist);
    });
}

function getFilterHtml(html) {
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

    let post = {
      id: elem
        .find('td')
        .eq(2)
        .text(),
      town_name: elem
        .find('td')
        .eq(3)
        .text(),
      news_type: 2,
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
      sort: elem
        .find('td')
        .eq(6)
        .text()
        .trim(),
      create_time: elem
        .find('td')
        .eq(11)
        .text()
        .trim(),
      type: 2
    };
    postList.push(post);
  });
  return postList;
}

function insertSqlFromJson(postlist) {
  pool.getConnection(function(err, connection) {
    var gdata = postlist;
    console.log(postlist.length);

    var myquery;
    for (var i = 0; i < gdata.length; i++) {
      myquery =
        "INSERT INTO in_server_townews (`id`,`town_name`,`news_type`,`title`, `pic_uri`,`type`,`create_time`)VALUES ( '" +
        gdata[i].id +
        "', '" +
        gdata[i].town_name +
        "', '" +
        gdata[i].news_type +
        "', '" +
        gdata[i].title +
        "', '" +
        gdata[i].pic_uri +
        "', '" +
        gdata[i].type +
        "', '" +
        gdata[i].create_time +
        "' );";

      connection.query(myquery, function(err, result) {
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
      news_id: params,
      type: 2
    })
    .end((err, res) => {
      if (err) throw Error(err);
      var content = JSON.parse(res.text)[0];
      content.id = params;
      content.type = 2;
      console.log(content);
      insertSqlFromObject(content);
    });
}

function insertSqlFromObject(content) {
  pool.getConnection(function(err, connection) {
    var gdata = content;
    var myquery;
    myquery =
      "INSERT INTO in_server_towncontent (`id`,`create_date`,`title`,`content`,`type`)VALUES ( '" +
      gdata.id +
      "', '" +
      gdata.create_date +
      "', '" +
      gdata.title +
      "', '" +
      gdata.content +
      "', '" +
      gdata.type +
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
    // 释放连接
    connection.release();
  });
}
