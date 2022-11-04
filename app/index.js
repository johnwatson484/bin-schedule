'use strict';
var fs = require('fs');
var path = require('path');
var request = require('request');
var cheerio = require('cheerio');
var phantom = require('phantom');
var nodemailer = require('nodemailer');

var pageSessionId = '';
var nonce = '';

var fileName = path.join(__dirname, 'BinSchedule.html');

request.get({
    url: "https://services.gateshead.gov.uk/bin-collection-dates",
    jar: true,
    followAllRedirects: true
}, function (err, resp, body) {

    console.log('Checking bin schedule');

    var $ = cheerio.load(body);

    pageSessionId = $('[name="BINCOLLECTIONCHECKER_PAGESESSIONID"]').val();
    var sessionId = $('[name="BINCOLLECTIONCHECKER_SESSIONID"]').val();
    nonce = $('[name="BINCOLLECTIONCHECKER_NONCE"]').val();
    var variables = $('[name="BINCOLLECTIONCHECKER_VARIABLES"]').val();
    var pageName = $('[name="BINCOLLECTIONCHECKER_PAGENAME"]').val();
    var pageInstance = $('[name="BINCOLLECTIONCHECKER_PAGEINSTANCE"]').val();
    var postCode = process.env.POSTCODE;
    var addressLookup = "21";
    var uprn = 100000016140;
    var ticks = $('[name="BINCOLLECTIONCHECKER_ADDRESSSEARCH_TICKS"]').val();
    var addressText = process.env.ADDRESS;
    var next = 'Next';
    var url = "https://services.gateshead.gov.uk/apiserver/formsservice/http/processsubmission?pageSessionId=" + pageSessionId + "&fsid=" + sessionId + "&fsn=" + nonce

    request.post({
        url: url,
        form: {
            'BINCOLLECTIONCHECKER_PAGESESSIONID': pageSessionId,
            'BINCOLLECTIONCHECKER_SESSIONID': sessionId,
            'BINCOLLECTIONCHECKER_NONCE': nonce,
            'BINCOLLECTIONCHECKER_VARIABLES': variables,
            'BINCOLLECTIONCHECKER_PAGENAME': pageName,
            'BINCOLLECTIONCHECKER_PAGEINSTANCE': pageInstance,
            'BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPPOSTCODE': postCode,
            'BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSLOOKUPADDRESS': addressLookup,
            'BINCOLLECTIONCHECKER_ADDRESSSEARCH_UPRN': uprn,
            'BINCOLLECTIONCHECKER_ADDRESSSEARCH_TICKS': ticks,
            'BINCOLLECTIONCHECKER_ADDRESSSEARCH_ADDRESSTEXT': addressText,
            'BINCOLLECTIONCHECKER_FORMACTION_NEXT': next
        },
        jar: "true",
        followAllRedirects: true

    }, function (err, resp, body) {

        var url = "https://services.gateshead.gov.uk/bin-collection-dates?formid=5499&pageSessionId=" + pageSessionId + "&fsn=" + nonce;
        var _ph, _page, _outObj;

        phantom
            .create()
            .then(ph => {
                _ph = ph;
                return _ph.createPage();
            })
            .then(page => {
                _page = page;
                return _page.open(url);
            })
            .then(status => {
                return _page.property('content');
            })
            .then(content => {                

                fs.writeFile(fileName, content, function (err) {
                    if (err) {
                        return console.log(err);
                    }

                    extractData();
                });
                
                setTimeout(function () { 
                    _page.close();
                    _ph.exit();
                }, 10000);
            });
    });
});

function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function extractData() {

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    var $ = cheerio.load(fs.readFileSync(fileName));

    $('tr').each(function () {
        var tr = $(this);
        if (tr.has('td').length) {
            var date = tr.find('td').eq(0).html().trim();
            var day = tr.find('td').eq(1).html().trim();
            var bin = tr.find('td').eq(2).children('a').text().replace('ingGar', 'ing and Gar').trim();
            var month = tr.prevUntil('tr:has(th)').length ? tr.prevUntil('tr:has(th)').prev().find('th').html() : tr.prev().find('th').html();
            var currentDate = new Date();

            if (month === monthNames[currentDate.getMonth()] && date === pad(currentDate.getDate(), 2)) {
                var message = 'Bin Day - ' + day + ' ' + date + ' ' + month + ' - ' + bin;
                console.log(message);
                sendEmail(message);
            }
            else {
                console.log('Not bin collection day');
            }
        }
    });

    console.log('Checking complete');
}

function sendEmail(message) {
    var transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 465,
        secure: true, //ssl
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    var mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.EMAILS,
        subject: 'Bin Day Alert',
        html: '<h3>Bin Day Alert</h3><p>' + message + '</p>'
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}
