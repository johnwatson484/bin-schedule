import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import phantom from 'phantom'
import cheerio from 'cheerio'
import request from 'request'
import sendEmail from './send-email.js'

let pageSessionId = ''
let nonce = ''

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fileName = path.join(__dirname, 'bin-schedule.html')

request.get({
  url: 'https://services.gateshead.gov.uk/bin-collection-dates',
  jar: true,
  followAllRedirects: true
}, function (err, resp, body) {
  console.log('Checking bin schedule')

  const $ = cheerio.load(body)

  pageSessionId = $('[name="BINCOLLECTIONCHECKER_PAGESESSIONID"]').val()
  const sessionId = $('[name="BINCOLLECTIONCHECKER_SESSIONID"]').val()
  nonce = $('[name="BINCOLLECTIONCHECKER_NONCE"]').val()
  const variables = $('[name="BINCOLLECTIONCHECKER_VARIABLES"]').val()
  const pageName = $('[name="BINCOLLECTIONCHECKER_PAGENAME"]').val()
  const pageInstance = $('[name="BINCOLLECTIONCHECKER_PAGEINSTANCE"]').val()
  const postCode = process.env.POSTCODE
  const addressLookup = '21'
  const uprn = 100000016140
  const ticks = $('[name="BINCOLLECTIONCHECKER_ADDRESSSEARCH_TICKS"]').val()
  const addressText = process.env.ADDRESS
  const next = 'Next'
  const url = 'https://services.gateshead.gov.uk/apiserver/formsservice/http/processsubmission?pageSessionId=' + pageSessionId + '&fsid=' + sessionId + '&fsn=' + nonce

  request.post({
    url,
    form: {
      BINCOLLECTIONCHECKER_PAGESESSIONID: pageSessionId,
      BINCOLLECTIONCHECKER_SESSIONID: sessionId,
      BINCOLLECTIONCHECKER_NONCE: nonce,
      BINCOLLECTIONCHECKER_VARIABLES: variables,
      BINCOLLECTIONCHECKER_PAGENAME: pageName,
      BINCOLLECTIONCHECKER_PAGEINSTANCE: pageInstance,
      BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPPOSTCODE: postCode,
      BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPADDRESS: addressLookup,
      BINCOLLECTIONCHECKER_ADDRESSSEARCH_UPRN: uprn,
      BINCOLLECTIONCHECKER_ADDRESSSEARCH_TICKS: ticks,
      BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSTEXT: addressText,
      BINCOLLECTIONCHECKER_FORMACTION_NEXT: next
    },
    jar: 'true',
    followAllRedirects: true

  }, function (err, resp, body) {
    const url = 'https://services.gateshead.gov.uk/bin-collection-dates?formid=5499&pageSessionId=' + pageSessionId + '&fsn=' + nonce
    let _ph, _page, _outObj

    phantom
      .create()
      .then(ph => {
        _ph = ph
        return _ph.createPage()
      })
      .then(page => {
        _page = page
        return _page.open(url)
      })
      .then(status => {
        return _page.property('content')
      })
      .then(content => {
        fs.writeFile(fileName, content, function (err) {
          if (err) {
            return console.log(err)
          }

          extractData()
        })

        setTimeout(function () {
          _page.close()
          _ph.exit()
        }, 10000)
      })
  })
})

function pad (num, size) {
  let s = num + ''
  while (s.length < size) s = '0' + s
  return s
}

function extractData () {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const $ = cheerio.load(fs.readFileSync(fileName))

  $('tr').each(function () {
    const tr = $(this)
    if (tr.has('td').length) {
      const date = tr.find('td').eq(0).html().trim()
      const day = tr.find('td').eq(1).html().trim()
      const bin = tr.find('td').eq(2).children('a').text().replace('ingGar', 'ing and Gar').trim()
      const month = tr.prevUntil('tr:has(th)').length ? tr.prevUntil('tr:has(th)').prev().find('th').html() : tr.prev().find('th').html()
      const currentDate = new Date()

      if (month === monthNames[currentDate.getMonth()] && date === pad(currentDate.getDate(), 2)) {
        const message = 'Bin Day - ' + day + ' ' + date + ' ' + month + ' - ' + bin
        console.log(message)
        sendEmail(message)
      } else {
        console.log('Not bin collection day')
      }
    }
  })

  console.log('Checking complete')
}
