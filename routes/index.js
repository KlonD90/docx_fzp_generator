const busboy = require('koa-busboy');
let database = require('../database.json') || [];
const fs = require('fs');
const uuid = require('uuid');

const uploader = busboy({
  dest: './upload/', // default is system temp folder (`os.tmpdir()`)
  fnDestFilename: (fieldname, filename) => uuid() + filename
});

const defaultMeta = [
  {name: "Название суда", key: "sud"},
  {name: "Номер административного дела", key: "nomer"},
  {name: "ФИО привлекаемого", key: "FIO_privlekayemy"},
  {name: "Фамилия привлекаемого", key: "F_priv"},
  {name: "Имя привлекаемого", key: "I_priv"},
  {name: "Отчество привлекаемого", key: "O_priv"},
  {name: "Адрес привлекаемого", key: "adress_priv"},
  {name: "Телефон привлекаемого", key: "phone_priv"},
  {name: "ФИО защитника по доверености", key: "FIO_zashita"},
  {name: "Фамилия защитника", key: "F_zash"},
  {name: "Имя защитника", key: "I_zash"},
  {name: "Отчество защитника", key: "O_zash"},
  {name: "Адрес защитника", key: "adress_zash"},
  {name: "Телефон защитника", key: "phone_zash"},
  {name: "Дата", key: "date"},
  {name: "Лицо подписавшее рапорт и давшее объяснение 1", key: "raport_1"},
  {name: "Лицо подписавшее рапорт и давшее объяснение 2", key: "raport_2"},
  {name: "Лица, составившие протоколы о доставлении и задержании (1)", key: "prot_1"},
  {name: "Лица, составившие протоколы о доставлении и задержании (2)", key: "prot_2"},
  {name: "Лицо, составившее протокол об адм. Правонарушении", key: "prot_3"},
  {name: "Лицо, направившее материалы дела в суд", key: "napr_v_sud"},
  {name: "Лицо, составившее протокол личного досмотра", key: "dosm"},
  {name: "Свидетели обвинения - понятые(1)", key: "pon_1"},
  {name: "Свидетели обвинения - понятые(2)", key: "pon_2"},
  {name: "Время, дата задержания", key: "time_zad"},
  {name: "Время задержания в протоколе", key: "time_zad_prot"},
  {name: "Время доставления в ОП", key: "time_dost"},
  {name: "Время доставления в протоколе", key: "time_dost_prot"},
  {name: "Время правонарушения в протоколе", key: "time_prav_prot"},
  {name: "Время, Дата покидания ОП", key: "time_ost"}
];

const defaultValue = '___________________';

module.exports =  (router) => {
  router.get('/', async (ctx, next) => {
    await ctx.render('index', {list: database});
  });

  router.get('/add', async(ctx) => {
    await ctx.render('add_form');
  });

  router.post('/add', uploader, async ctx => {
    // fields
    // text fields is add to ctx.request.body object
    let { name } = ctx.request.body;
    // files
    // uploaded files is add to ctx.request.files array
    let files = ctx.request.files;
    let obj = {name: name};
    files.forEach((f) => {
      obj[f.fieldname] = f.path;
    });
    database.push(obj);
    console.log(database);
    fs.writeFileSync('./database.json', JSON.stringify(database), {encoding: 'utf-8'});
    ctx.redirect('/');
  });

  router.get('/create/:id', async ctx => {
    await ctx.render('create_form', {
      item: database[ctx.params.id],
      meta:
        (
          database[ctx.params.id].meta &&
            JSON.parse(
              fs.readFileSync(
                database[ctx.params.id].meta,
                {encoding: 'utf-8'}
              )
            )
        ) || defaultMeta,
      index: ctx.params.id
    });
  });

  router.post('/create/:id', async ctx => {
    let obj = ctx.request.body;
    const meta = (
        database[ctx.params.id].meta &&
        JSON.parse(
          fs.readFileSync(
            database[ctx.params.id].meta,
            {encoding: 'utf-8'}
          )
        )
      ) || defaultMeta;
    const metaMap = meta.reduce((r, x) => {r[x.key] = true; return r;}, {});
    for (var p in metaMap)
    {
      if (!obj[p])
        obj[p] = defaultValue;
    }

    console.log('obj', obj);
    let fileName = 'generated_'+(obj.FIO_privlekayemy?(obj.FIO_privlekayemy.split(' ').join('_')):Date.now())+'.docx';
    var JSZip = require('jszip');
    var Docxtemplater = require('docxtemplater');


    var path = require('path');

//Load the docx file as a binary
    var content = fs
      .readFileSync(database[ctx.params.id].docx, 'binary');

    var zip = new JSZip(content);

    var doc = new Docxtemplater();
    doc.loadZip(zip);

//set the templateVariables
    doc.setData(obj);

    try {
      // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
      doc.render()
    }
    catch (error) {
      var e = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        properties: error.properties,
      }
      console.log(JSON.stringify({error: e}));
      // The error thrown here contains additional information when logged with JSON.stringify (it contains a property object).
      throw error;
    }

    var buf = doc.getZip()
      .generate({type: 'nodebuffer'});

// buf is a nodejs buffer, you can either write it to a file or do anything else with it.
    fs.writeFileSync(path.resolve(__dirname, 'output.docx'), buf)
    ctx.attachment(fileName)
    ctx.type ='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    ctx.body = buf;
  });

  router.get('/item/:id', async ctx => {
    await ctx.render('edit_form', database[ctx.params.id]);
  });

  router.put('/item/:id', async ctx => {
    ctx.redirect('/item/:id');
  });
}
