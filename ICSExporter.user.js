// ==UserScript==
// @name         ICS Exporter
// @version      0.4
// @description  ICS naar CSV
// @author       Oon
// @match        https://icscards.nl/mijn*
// @match        https://www.icscards.nl/mijn*
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @updateURL    https://github.com/IeuanK/ICS-Exporter/raw/main/ICSExporter.user.js
// @downloadURL  https://github.com/IeuanK/ICS-Exporter/raw/main/ICSExporter.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var cardNumber = 0;
    var cardNumberInterval = null;
    var lastPeriod = null;
    var firstPeriod = null;
    var ICSExporterWindow = $(`
        <div class="ics-exporter" style="display: none;">
            <h1>ICS Exporter</h1>
            <h4>Kaartnummer: <span class="card-no"></span></h4>
            <ul class="overzichten">
            </ul>
        </div>
    `);
    var ICSExporterStyle = $('<style type="text/css" id="ics-exporter-style"></style>').html(`
        div.ics-exporter, div.ics-exporter * {
            box-sizing: border-box;
        }

        div.ics-exporter {
            display: block;
            width: 500px;
            height: auto;
            position: fixed;
            left: -475px;
            top: 10%;
            overflow: hidden;
            background: #fff;
            border-radius: 5px;
            padding: 15px;
            transition: 100ms;
            max-height: 75vh;
            overflow-y: auto;
        }

        div.ics-exporter:hover, div.ics-exporter:focus, div.ics-exporter:focus-within {
            left: 0px;
            box-shadow: 8px 8px 15px -15px #000;
        }

        div.ics-exporter h1, div.ics-exporter h4 {
            margin-top: 5px;
            margin-bottom: 5px;
            display: inline-block;
            height: 42px;
            line-height: 42px;
        }

        div.ics-exporter h4 {
            float: right;
        }

        div.ics-exporter ul.overzichten {
            display: block;
            list-style: none;
            margin: 0;
            padding: 0;
            width: 100%;
        }

        div.ics-exporter ul.overzichten li {
            display: block;
            list-style: none;
            margin: 0 0 5px;
            padding: 0;
            width: 100%;
            height: 30px;
            line-height: 30px;
            padding: 0 5px;
            background: rgba(155, 243, 178, 0.15);
        }

        div.ics-exporter ul.overzichten li a.ics-exporter-dl,
        div.ics-exporter ul.overzichten li a.ics-exporter-dl:hover,
        div.ics-exporter ul.overzichten li a.ics-exporter-dl:active,
        div.ics-exporter ul.overzichten li a.ics-exporter-dl:visited {
            display: inline-block;
            float: right;
            background: rgba(0,0,0,0.1);
            width: 30px;
            height: 30px;
            line-height: 30px;
            text-align: center;
            cursor: pointer;
            font-weight: bold;
            color: #404073;
        }

        div.ics-exporter ul.overzichten li:not(.loaded) {
            cursor: pointer;
            background: rgba(100,100,100,0.15);
        }

        div.ics-exporter ul.overzichten li:not(.loaded) a.ics-exporter-dl {
            display: none;
        }
    `);

    function lM(m) {
        console.log('[ICS Exporter]: ', m);
    }

    function bootICS() {
        lM('Append elements');
        appendElements();
        lM('Append style');
        appendStyle();
        lM('Get card number');
        getCardNumber();
        lM('Card number: ' + cardNumber);
    }

    function appendElements() {
        $('body').append(ICSExporterWindow);
    }

    function appendStyle() {
        $('head').append(ICSExporterStyle);
    }

    function checkCardNumberNodes() {
        $('.cardinfo-container .b-card-info__details div').each(function () {
            let _txt = $(this).text().trim();
            if (/^([0-9]{6,})$/.test(_txt)) {
                cardNumber = parseInt(_txt, 10);
            }
        });
    }

    function getCardNumber() {
        console.log('[ICS] Kaartnummer ophalen');
        cardNumberInterval = setInterval(function () {
            console.log('[ICS] Poging');
            checkCardNumberNodes();

            if (cardNumber !== 0) {
                clearInterval(cardNumberInterval);
                console.log('[ICS] Kaartnummer opgehaald, UI tonen');
                showUI();
            }
        }, 500);
    }

    function showUI() {
        ICSExporterWindow.css('display', 'block');
        ICSExporterWindow.find('span.card-no').text(cardNumber);

        getPeriods();

        $(document).on('click', '.ics-exporter ul.overzichten li:not(.loaded)', function (ev) {
            var _el = $(this);
            ev.preventDefault();
            var period = _el.attr('data-period');
            console.log('[ICS] DL click, ' + period);
            getCSVData(period, function(csvData) {
                console.log('[ICS] getCSVData callback');
                _el.addClass('loaded');

                let btn = _el.find('.ics-exporter-dl');
                csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvData);
                btn.attr({
                    'download': period + '.csv',
                    'href': csvData,
                    'target': '_blank'
                });
            });
        });
    }

    function getPeriods() {
        var token = getCookie('XSRF-TOKEN');
        $.ajax({
            url: window.location.origin + "/sec/nl/sec/periods",
            data: {accountNumber: cardNumber},
            type: "GET",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('X-XSRF-TOKEN', token);
            },
            success: function (data) {
                loadPeriods(data);
            }
        });
    }

    function loadPeriods(data) {
        if(data.length) {
            $.each(data, function(index, period) {
                var periodNode = $('<li data-period="'+(period.currentPeriod ? 'cur-' : '')+period.period+'"><strong>'+period.period+'</strong>'+(period.currentPeriod ? '*' : '')+' ('+period.startDatePeriod+' t/m '+period.endDatePeriod+') <a class="ics-exporter-dl" data-period="'+(period.currentPeriod ? 'cur-' : '')+period.period+'">DL</a></li>');
                ICSExporterWindow.find('.overzichten').append(periodNode);
                if(firstPeriod === null) {
                    firstPeriod = period;
                }
                lastPeriod = period;
            });
            var periodNode = $('<li data-period="all-'+lastPeriod.period+'"><strong>All</strong> ('+lastPeriod.period+' t/m '+firstPeriod.period+')<a class="ics-exporter-dl" data-period="all-'+lastPeriod.period+'">DL</a></li>');
            ICSExporterWindow.find('.overzichten').append(periodNode);
        }
    }

    function getCookie(cookieName) {
        var name = cookieName + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i].trim();
            if ((c.indexOf(name)) == 0) {
                return c.substr(name.length);
            }

        }
        return null;
    }

    function getCSVData(period, callback) {
        console.log('[ICS] getCSVData ', period);
        getDataForPeriod(period, function(items) {
            console.log('[ICS] getDataForPeriod callback');

            let replacer = (key, value) => value === null ? '' : value
            let header = Object.keys(items[0]);

            // Filter out rows where typeOfTransaction is "A" or batchSequenceNr is -1
            let filteredItems = items.filter(row => {
                let typeOfTransaction = String(row.typeOfTransaction).trim();
                let batchSequenceNr = String(row.batchSequenceNr).trim();
                return typeOfTransaction !== "A" && batchSequenceNr !== "-1";
            });

            let csv = filteredItems.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
            csv.unshift(header.join(','));
            csv = csv.join('\r\n');

            callback(csv);
        });
    }

    function getDataForPeriod(period, callback) {
        console.log('[ICS] getDataForPeriod');
        var token = getCookie('XSRF-TOKEN');
        var _url = window.location.origin + "/sec/nl/sec/transactions";
        var _data = {
            accountNumber: cardNumber,
            flushCache: true
        }
        if(period.slice(0, 3) == 'all') {
            // https://icscards.nl/sec/nl/sec/transactions/search?fromDate=2021-01-01&accountNumber=<red>
            _url = window.location.origin + "/sec/nl/sec/transactions/search";
            _data.fromDate = lastPeriod.period + "-01";
        } else if(period.slice(0, 3) == 'cur') {
            /// url = https://icscards.nl/sec/nl/sec/transactions?accountNumber=<red>&flushCache=true
            // We hoeven hier niks te doen behalve niet filteren
        } else {
            _data.fromPeriod = period;
            _data.untilPeriod = period;
        }
        // Request uitvoeren
        $.ajax({
            url: _url,
            data: _data,
            type: "GET",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('X-XSRF-TOKEN', token);
            },
            success: function (data) {
                callback(data);
            }
        });
    }

    if (window.location.host === "www.icscards.nl" ||
        window.location.host === "icscards.nl") {
        if(window.location.pathname === "/mijn/overview") {
            console.log('Correcte url');
            window.jQuery341 = $.noConflict(true);
            window.jQuery341(function ($) {
                lM('Boot');
                bootICS();
            });
        }
    }

})();
