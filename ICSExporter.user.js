// ==UserScript==
// @name         ICS Exporter
// @version      0.10
// @description  ICS naar CSV
// @author       Oon
// @match        https://icscards.nl/mijn*
// @match        https://www.icscards.nl/mijn*
// @match        https://icscards.nl/abnamro/mijn/*
// @match        https://www.icscards.nl/abnamro/mijn/*
// @match        https://www.icscards.nl/web/consumer/dashboard
// @match        https://www.icscards.nl/web/consumer/abnamro/dashboard
// @require      https://code.jquery.com/jquery-3.6.0.min.js
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
    var years = [];
    var ICSExporterWindow = $(`
        <div class="ics-exporter" style="display: none;">
            <div class="ics-header">
                <h1>ICS Exporter</h1>
                <h4>Kaartnummer: <span class="card-no"></span></h4>
            </div>
            <div class="ics-content">
                <select id="jaren">
                    <option value="all">Alle</option>
                </select>
                <ul class="overzichten">
                </ul>
            </div>
        </div>
    `);
    var ICSExporterStyle = $('<style type="text/css" id="ics-exporter-style"></style>').html(`
        div.ics-exporter, div.ics-exporter * {
            box-sizing: border-box;
        }

        div.ics-exporter {
            display: block;
            width: 420px;
            height: auto;
            position: fixed;
            right: -380px;
            top: 10%;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 12px 0 0 12px;
            padding: 0;
            transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
            max-height: 80vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            box-shadow: -2px 0 15px rgba(0, 0, 0, 0.08);
            z-index: 9999;
        }

        div.ics-exporter::before {
            content: 'CSV';
            position: absolute;
            left: -32px;
            top: 50%;
            transform: translateY(-50%) rotate(-90deg);
            background: linear-gradient(135deg, #4a6cf7 0%, #6366f1 100%);
            color: white;
            padding: 8px 16px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1px;
            border-radius: 6px 6px 0 0;
            cursor: pointer;
        }

        div.ics-exporter:hover, div.ics-exporter:focus, div.ics-exporter:focus-within {
            right: 0px;
            box-shadow: -8px 0 30px rgba(0, 0, 0, 0.15);
        }

        div.ics-exporter .ics-header {
            background: linear-gradient(135deg, #4a6cf7 0%, #6366f1 100%);
            padding: 16px 20px;
            margin: 0;
            border-radius: 12px 0 0 0;
        }

        div.ics-exporter h1 {
            margin: 0 0 4px 0;
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
            display: block;
        }

        div.ics-exporter h4 {
            margin: 0;
            font-size: 13px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.85);
            display: block;
        }

        div.ics-exporter .ics-content {
            padding: 16px 20px;
            max-height: calc(80vh - 80px);
            overflow-y: auto;
        }

        div.ics-exporter .ics-content::-webkit-scrollbar {
            width: 6px;
        }

        div.ics-exporter .ics-content::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
        }

        div.ics-exporter .ics-content::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }

        div.ics-exporter .ics-content::-webkit-scrollbar-thumb:hover {
            background: #a1a1a1;
        }

        div.ics-exporter select#jaren {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            color: #374151;
            background: #ffffff;
            cursor: pointer;
            margin-bottom: 12px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        div.ics-exporter select#jaren:hover {
            border-color: #6366f1;
        }

        div.ics-exporter select#jaren:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        div.ics-exporter ul.overzichten {
            display: block;
            list-style: none;
            margin: 0;
            padding: 0;
            width: 100%;
        }

        div.ics-exporter ul.overzichten li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            list-style: none;
            margin: 0 0 8px;
            padding: 10px 12px;
            width: 100%;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 13px;
            color: #374151;
            transition: all 0.2s ease;
        }

        div.ics-exporter ul.overzichten li.hidden {
            display: none;
        }

        div.ics-exporter ul.overzichten li strong {
            color: #1f2937;
            font-weight: 600;
        }

        div.ics-exporter ul.overzichten li.loaded {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-color: #a7f3d0;
        }

        div.ics-exporter ul.overzichten li:not(.loaded) {
            cursor: pointer;
        }

        div.ics-exporter ul.overzichten li:not(.loaded):hover {
            background: #f8fafc;
            border-color: #6366f1;
            transform: translateX(-2px);
        }

        div.ics-exporter ul.overzichten li a.ics-exporter-dl,
        div.ics-exporter ul.overzichten li a.ics-exporter-dl:visited {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #4a6cf7 0%, #6366f1 100%);
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 11px;
            color: #ffffff;
            text-decoration: none;
            transition: transform 0.2s, box-shadow 0.2s;
            flex-shrink: 0;
            margin-left: 8px;
        }

        div.ics-exporter ul.overzichten li a.ics-exporter-dl:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        div.ics-exporter ul.overzichten li a.ics-exporter-dl:active {
            transform: scale(0.95);
        }

        div.ics-exporter ul.overzichten li:not(.loaded) a.ics-exporter-dl {
            display: none;
        }
    `);

    ICSExporterWindow.on('change', '#jaren', function(ev, el) {
        let sel = ICSExporterWindow.find('#jaren').val();
        ICSExporterWindow.find('.overzichten').find('li').each(function(index, node) {
            let n = $(node);
            if(sel == 'all') {
                n.removeClass('hidden');
                return true;
            }
            if(n.attr('data-year') != sel) {
                n.addClass('hidden');
                return true;
            } else {
                n.removeClass('hidden');
                return true;
            }

        });
    });

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
        $('.account-number').each(function () {
            let _txt = $(this).text().trim();
            if (/^([0-9]{6,})$/.test(_txt)) {
                cardNumber = parseInt(_txt, 10);
                lM('Card number found: ' + cardNumber);
            }
        });
        if(!cardNumber) {
            lM('No card number found');
        }
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
                let year = period.period.slice(0,4);
                if(years.indexOf(year) === -1) {
                    years.push(year);
                }
                var periodNode = $('<li data-period="'+(period.currentPeriod ? 'cur-' : '')+period.period+'" data-year="'+year+'"><strong>'+period.period+'</strong>'+(period.currentPeriod ? '*' : '')+' ('+period.startDatePeriod+' t/m '+period.endDatePeriod+') <a class="ics-exporter-dl" data-period="'+(period.currentPeriod ? 'cur-' : '')+period.period+'">DL</a></li>');
                ICSExporterWindow.find('.overzichten').append(periodNode);
                if(firstPeriod === null) {
                    firstPeriod = period;
                }
                lastPeriod = period;
            });
            var periodNode = $('<li data-period="all-'+lastPeriod.period+'" data-year="all"><strong>All</strong> ('+lastPeriod.period+' t/m '+firstPeriod.period+')<a class="ics-exporter-dl" data-period="all-'+lastPeriod.period+'">DL</a></li>');
            ICSExporterWindow.find('.overzichten').append(periodNode);
        }
        let highestYear = 0;
        $.each(years, function(index, year) {
            var jaarOption = $('<option val="'+year+'">'+year+'</option>');
            ICSExporterWindow.find('#jaren').append(jaarOption);
            if(year > highestYear) {
                highestYear = year;
            }
        });
        ICSExporterWindow.find('#jaren').val(highestYear).change();
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
            let header = [...Object.keys(items[0]), 'payee', 'cleared'];

            // Filter out rows where typeOfTransaction is "A" or batchSequenceNr is -1
            let filteredItems = items.map(row => {
//                console.log(row);
                let typeOfTransaction = String(row.typeOfTransaction).trim();
                let batchSequenceNr = String(row.batchSequenceNr).trim();
                row.payee = row.description;
                if(typeOfTransaction == "A" && batchSequenceNr == "-1") {
                    row.description = "[R] " + row.description;
                    row.cleared = false;
                } else {
                    row.cleared = true;
                }
//                console.log(row);
                return row;
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

    $(() => {
        lM('Boot');
        bootICS();
    });

})();
