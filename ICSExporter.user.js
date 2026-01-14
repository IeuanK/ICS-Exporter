// ==UserScript==
// @name         ICS Exporter
// @version      0.12
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
    var periodsByYear = {};
    var ICSExporterWindow = $(`
        <div class="ics-exporter" style="display: none;">
            <div class="ics-header">
                <h1>ICS Exporter</h1>
                <h4>Kaartnummer: <span class="card-no"></span></h4>
            </div>
            <div class="ics-content">
                <select id="jaren">
                    <option value="all">Alle</option>
                    <option value="custom">Aangepast</option>
                </select>
                <ul class="overzichten">
                </ul>
                <div class="custom-range" style="display: none;">
                    <div class="form-group">
                        <label for="start-date">Startdatum</label>
                        <input type="date" id="start-date">
                    </div>
                    <div class="form-group">
                        <label for="end-date">Einddatum</label>
                        <input type="date" id="end-date">
                    </div>
                    <div class="form-group checkbox-group">
                        <label>
                            <input type="checkbox" id="skip-reserved" checked>
                            <span>Gereserveerd overslaan</span>
                        </label>
                    </div>
                    <button id="custom-download" class="download-btn">Download</button>
                </div>
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

        div.ics-exporter ul.overzichten li.bulk-option {
            background: linear-gradient(135deg, #4a6cf7 0%, #6366f1 100%);
            border-color: #4a6cf7;
            color: #ffffff;
        }

        div.ics-exporter ul.overzichten li.bulk-option strong {
            color: #ffffff;
        }

        div.ics-exporter ul.overzichten li.bulk-option:not(.loaded):hover {
            background: linear-gradient(135deg, #3b5de7 0%, #5254e1 100%);
            border-color: #3b5de7;
            transform: translateX(-2px);
        }

        div.ics-exporter ul.overzichten li.bulk-option.loaded {
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            border-color: #22c55e;
        }

        div.ics-exporter ul.overzichten li.bulk-option a.ics-exporter-dl,
        div.ics-exporter ul.overzichten li.bulk-option a.ics-exporter-dl:visited {
            background: rgba(255, 255, 255, 0.25);
            color: #ffffff;
        }

        div.ics-exporter ul.overzichten li.bulk-option a.ics-exporter-dl:hover {
            background: rgba(255, 255, 255, 0.35);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        div.ics-exporter ul.overzichten li.bulk-option .bulk-progress {
            font-size: 11px;
            opacity: 0.9;
            margin-left: 8px;
        }

        div.ics-exporter .custom-range {
            padding: 4px 0;
        }

        div.ics-exporter .custom-range .form-group {
            margin-bottom: 12px;
        }

        div.ics-exporter .custom-range label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 6px;
        }

        div.ics-exporter .custom-range input[type="date"] {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            color: #374151;
            background: #ffffff;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        div.ics-exporter .custom-range input[type="date"]:hover {
            border-color: #6366f1;
        }

        div.ics-exporter .custom-range input[type="date"]:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        div.ics-exporter .custom-range .checkbox-group label {
            display: flex;
            align-items: center;
            cursor: pointer;
            margin-bottom: 0;
        }

        div.ics-exporter .custom-range .checkbox-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
            margin-right: 10px;
            accent-color: #6366f1;
            cursor: pointer;
        }

        div.ics-exporter .custom-range .checkbox-group span {
            font-weight: 400;
        }

        div.ics-exporter .custom-range .download-btn {
            width: 100%;
            padding: 12px 16px;
            background: linear-gradient(135deg, #4a6cf7 0%, #6366f1 100%);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        div.ics-exporter .custom-range .download-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        div.ics-exporter .custom-range .download-btn:active {
            transform: translateY(0);
        }

        div.ics-exporter .custom-range .download-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
    `);

    ICSExporterWindow.on('change', '#jaren', function() {
        let sel = ICSExporterWindow.find('#jaren').val();
        let listEl = ICSExporterWindow.find('.overzichten');
        let customEl = ICSExporterWindow.find('.custom-range');

        if(sel === 'custom') {
            // Show custom date range form, hide list
            listEl.hide();
            customEl.show();
            return;
        }

        // Show list, hide custom form
        listEl.show();
        customEl.hide();

        ICSExporterWindow.find('.overzichten').find('li').each(function(index, node) {
            let n = $(node);
            let itemYear = n.attr('data-year');
            let isBulkOption = n.hasClass('bulk-option');
            let isYearBulk = isBulkOption && itemYear !== 'all';

            if(sel === 'all') {
                // Show "Alle" bulk option and all individual periods, but NOT year bulk options
                if(isYearBulk) {
                    n.addClass('hidden');
                } else {
                    n.removeClass('hidden');
                }
            } else {
                // Show items matching selected year (including year bulk option), hide others
                if(itemYear === sel) {
                    n.removeClass('hidden');
                } else {
                    n.addClass('hidden');
                }
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

            // Check if this is a year bulk download
            if(period.slice(0, 5) === 'year-') {
                var year = period.slice(5);
                console.log('[ICS] Year bulk download for ' + year);
                getYearCSVData(year, _el, function(csvData) {
                    console.log('[ICS] getYearCSVData callback');
                    _el.addClass('loaded');

                    let btn = _el.find('.ics-exporter-dl');
                    csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvData);
                    btn.attr({
                        'download': year + '.csv',
                        'href': csvData,
                        'target': '_blank'
                    });
                });
            } else {
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
            }
        });

        // Custom date range download handler
        $(document).on('click', '.ics-exporter #custom-download', function(ev) {
            ev.preventDefault();
            var btn = $(this);
            var startDate = ICSExporterWindow.find('#start-date').val();
            var endDate = ICSExporterWindow.find('#end-date').val();
            var skipReserved = ICSExporterWindow.find('#skip-reserved').is(':checked');

            if(!startDate || !endDate) {
                alert('Vul beide datums in');
                return;
            }

            if(startDate > endDate) {
                alert('Startdatum moet voor einddatum liggen');
                return;
            }

            btn.prop('disabled', true).text('Downloaden...');

            getCustomRangeCSVData(startDate, endDate, skipReserved, function(csvData) {
                btn.prop('disabled', false).text('Download');

                // Trigger download
                var filename = 'ICS_' + startDate + '_' + endDate + '.csv';
                var dataUri = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvData);
                var link = document.createElement('a');
                link.setAttribute('href', dataUri);
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
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
            // First pass: collect periods and group by year
            $.each(data, function(index, period) {
                let year = period.period.slice(0,4);
                if(years.indexOf(year) === -1) {
                    years.push(year);
                    periodsByYear[year] = {
                        periods: [],
                        startDate: null,
                        endDate: null
                    };
                }
                periodsByYear[year].periods.push(period);
                // Track earliest start date and latest end date for each year
                if(periodsByYear[year].startDate === null || period.startDatePeriod < periodsByYear[year].startDate) {
                    periodsByYear[year].startDate = period.startDatePeriod;
                }
                if(periodsByYear[year].endDate === null || period.endDatePeriod > periodsByYear[year].endDate) {
                    periodsByYear[year].endDate = period.endDatePeriod;
                }
                if(firstPeriod === null) {
                    firstPeriod = period;
                }
                lastPeriod = period;
            });

            // Add "Alle" bulk option at the top (only visible when "Alle" is selected)
            var alleNode = $('<li class="bulk-option" data-period="all-'+lastPeriod.period+'" data-year="all"><span><strong>Alle</strong> ('+lastPeriod.startDatePeriod+' t/m '+firstPeriod.endDatePeriod+')</span><a class="ics-exporter-dl" data-period="all-'+lastPeriod.period+'">DL</a></li>');
            ICSExporterWindow.find('.overzichten').append(alleNode);

            // Add year bulk options (sorted descending)
            years.sort().reverse();
            $.each(years, function(index, year) {
                var yearData = periodsByYear[year];
                var yearNode = $('<li class="bulk-option" data-period="year-'+year+'" data-year="'+year+'"><span><strong>'+year+'</strong> ('+yearData.startDate+' t/m '+yearData.endDate+')</span><a class="ics-exporter-dl" data-period="year-'+year+'">DL</a></li>');
                ICSExporterWindow.find('.overzichten').append(yearNode);
            });

            // Add individual periods (sorted by period descending - newest first)
            $.each(data, function(index, period) {
                let year = period.period.slice(0,4);
                var periodNode = $('<li data-period="'+(period.currentPeriod ? 'cur-' : '')+period.period+'" data-year="'+year+'"><span><strong>'+period.period+'</strong>'+(period.currentPeriod ? '*' : '')+' ('+period.startDatePeriod+' t/m '+period.endDatePeriod+')</span><a class="ics-exporter-dl" data-period="'+(period.currentPeriod ? 'cur-' : '')+period.period+'">DL</a></li>');
                ICSExporterWindow.find('.overzichten').append(periodNode);
            });
        }
        let highestYear = 0;
        $.each(years, function(index, year) {
            var jaarOption = $('<option value="'+year+'">'+year+'</option>');
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

    function getYearCSVData(year, element, callback) {
        console.log('[ICS] getYearCSVData for year ' + year);
        var yearData = periodsByYear[year];
        if(!yearData || !yearData.periods.length) {
            console.log('[ICS] No periods found for year ' + year);
            return;
        }

        var allItems = [];
        var periodsToFetch = yearData.periods.slice(); // Clone array
        var totalPeriods = periodsToFetch.length;
        var fetchedCount = 0;

        // Add progress indicator
        var progressSpan = element.find('.bulk-progress');
        if(progressSpan.length === 0) {
            element.find('span').first().append('<span class="bulk-progress">(0/' + totalPeriods + ')</span>');
            progressSpan = element.find('.bulk-progress');
        }

        function fetchNextPeriod() {
            if(periodsToFetch.length === 0) {
                // All periods fetched, generate CSV
                console.log('[ICS] All periods fetched, total items: ' + allItems.length);
                if(allItems.length === 0) {
                    progressSpan.text('(geen data)');
                    return;
                }

                let replacer = (key, value) => value === null ? '' : value;
                let header = [...Object.keys(allItems[0]), 'payee', 'cleared'];

                let filteredItems = allItems.map(row => {
                    let typeOfTransaction = String(row.typeOfTransaction).trim();
                    let batchSequenceNr = String(row.batchSequenceNr).trim();
                    row.payee = row.description;
                    if(typeOfTransaction == "A" && batchSequenceNr == "-1") {
                        row.description = "[R] " + row.description;
                        row.cleared = false;
                    } else {
                        row.cleared = true;
                    }
                    return row;
                });

                let csv = filteredItems.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
                csv.unshift(header.join(','));
                csv = csv.join('\r\n');

                progressSpan.text('');
                callback(csv);
                return;
            }

            var periodObj = periodsToFetch.shift();
            var periodId = (periodObj.currentPeriod ? 'cur-' : '') + periodObj.period;
            console.log('[ICS] Fetching period ' + periodId);

            getDataForPeriod(periodId, function(items) {
                fetchedCount++;
                progressSpan.text('(' + fetchedCount + '/' + totalPeriods + ')');

                if(items && items.length) {
                    allItems = allItems.concat(items);
                }
                // Fetch next period
                fetchNextPeriod();
            });
        }

        fetchNextPeriod();
    }

    function getCustomRangeCSVData(startDate, endDate, skipReserved, callback) {
        console.log('[ICS] getCustomRangeCSVData from ' + startDate + ' to ' + endDate);
        var token = getCookie('XSRF-TOKEN');

        $.ajax({
            url: window.location.origin + "/sec/nl/sec/transactions/search",
            data: {
                accountNumber: cardNumber,
                fromDate: startDate,
                untilDate: endDate
            },
            type: "GET",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('X-XSRF-TOKEN', token);
            },
            success: function (items) {
                console.log('[ICS] getCustomRangeCSVData received ' + items.length + ' items');

                if(!items || items.length === 0) {
                    alert('Geen transacties gevonden in deze periode');
                    callback('');
                    return;
                }

                let replacer = (key, value) => value === null ? '' : value;
                let header = [...Object.keys(items[0]), 'payee', 'cleared'];

                let filteredItems = items.filter(row => {
                    let typeOfTransaction = String(row.typeOfTransaction).trim();
                    let batchSequenceNr = String(row.batchSequenceNr).trim();
                    let isReserved = typeOfTransaction === "A" && batchSequenceNr === "-1";

                    // Skip reserved transactions if checkbox is checked
                    if(skipReserved && isReserved) {
                        return false;
                    }
                    return true;
                }).map(row => {
                    let typeOfTransaction = String(row.typeOfTransaction).trim();
                    let batchSequenceNr = String(row.batchSequenceNr).trim();
                    row.payee = row.description;
                    if(typeOfTransaction === "A" && batchSequenceNr === "-1") {
                        row.description = "[R] " + row.description;
                        row.cleared = false;
                    } else {
                        row.cleared = true;
                    }
                    return row;
                });

                if(filteredItems.length === 0) {
                    alert('Geen transacties gevonden (alleen gereserveerde transacties in deze periode)');
                    callback('');
                    return;
                }

                let csv = filteredItems.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
                csv.unshift(header.join(','));
                csv = csv.join('\r\n');

                callback(csv);
            },
            error: function() {
                alert('Fout bij ophalen van transacties');
                callback('');
            }
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
