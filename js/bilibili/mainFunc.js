/**
 * 获得视频 cid 以及播放器接口
 * @returns {Function} 播放器对象
 */
function getPlayer() {
    var player = null;
    if ($('#player_placeholder > param[name=flashvars]').val()) {
        console.log('new');
        player = $('#player_placeholder')[0];
    } else {
        console.log('old');
    }
    return player;
}

/**
 * 获得视频 cid
 * @returns {String} 视频的 cid
 */
function getCid() {
    return $('.player-wrapper').html().match(/cid=\d*/)[0].slice(4);
}

/**
 * 获得弹幕数据
 * @param {String} cid 视频的 cid
 * @returns {Object} 弹幕的 XML 树
 */
function getDanmukuData(cid) {
    var danmukuAddress = 'http://comment.bilibili.com/' + cid + '.xml';
    return $.ajax({
        url: danmukuAddress,
        processData: false,
        cache: false,
        async: false,
        dataType: 'xml'
    }).responseXML;
}

/**
 * 解析弹幕数据
 * @param {Object} danmukuData 弹幕的 XML 树
 * @returns {Array} 弹幕时间数据，每个元素是弹幕发送的时间
 */
function parseDanmukuData(danmukuData) {
    var danmukuTime = [];
    $(danmukuData).find('d').each(function() {
        var param = $(this).attr('p').split(',').map(function(str) {
            return parseInt(str);
        });
        if (param[5] === 0) {
            danmukuTime.push(parseInt(param[0]));
        }
    });
    return danmukuTime;
}

/**
 * 绘制并返回 eCharts 图表
 * @param {Object} danmukuData 处理过的弹幕数据
 * @returns {Object} 绘制好的 eCharts 对象
 */
function drawChart(danmukuData) {
    $('.scontent').css('margin-bottom', '0');
    $('.scontent').after(domChartInner);
    var myChart = echarts.init(document.getElementById(domChartId));
    chartOption.xAxis.data = danmukuData.partDanmukuTime;
    chartOption.series.data = danmukuData.partDanmukuRho;
    chartOption.series.markLine.data[0].yAxis = danmukuData.avgRho;
    myChart.setOption(chartOption);
    
    return myChart;
}

/**
 * 在图表和播放器之间添加钩子以实现进度条同步
 * @param {Object} myChart 图表的 eCharts 对象
 * @param {Object} player 播放器对象
 * @param {Number} step 图表上每一格对应的秒数
 */
function addPlayerHook(myChart, player, step) {
    if (!player) {
        console.warn('Waring: Old player is not supported.');
    } else {
        chartOption.series.markLine.data.push(chartTimeline);

        myChart.on('click', function(params) {
            var timeStamp = null;
            if (params.componentType === "markPoint") {
                timeStamp = params.data.coord[0];
            } else {
                timeStamp = params.dataIndex;
            }
            var time = timeStamp * step - timeInAdvance;
            if (time < 0) {
                time = 0;
            }
            player.jwSeek(time);
        });

        var timelineMove = setInterval(function() {
            try {
                var nowTime = Math.floor(player.jwGetPosition());
            } catch (e) {
                if ((e + '') !== 'TypeError: player.jwGetPosition is not a function') {
                    console.error(e);
                }
                return;
            }
            chartOption.series.markLine.data[1].label.normal.formatter = timeNumToStr(nowTime);
            chartOption.series.markLine.data[1].xAxis = Math.floor(nowTime / step);
            myChart.setOption(chartOption);
        }, 500);
    }
}

// START
if (isOpen) {
    var cid = getCid();
    var player = getPlayer();
    var danmukuData = getDanmukuData(cid);
    var danmukuTime = parseDanmukuData(danmukuData);
    var chartData = makeChartData(danmukuTime);
    var myChart = drawChart(chartData);
    addPlayerHook(myChart, player, chartData.step);
}