(function (global){
	var addEvent = global.addEventListener ?  function (elt,event,handler){
		elt.addEventListener(event,handler,false);
	} : function (elt,event,handler){
		elt.attachEvent('on' + event,function (){
			var e = global.event,
				ret;
			e.preventDefault = function (){
				ret = false;
			}
			e.target = e.srcElement;
			handler.call(elt,e);
			return false;
		});
	},
	cssLoaded = false;
	function toTens(num){
		return num < 10 ? '0' + num : '' + num;
	}
	function SimpleCalendar(setting){
		setting = setting || {};
		this.input = setting.input;
		this.parent = setting.parent;
		this.handler = setting.handler;
		this.format = setting.format || ['年','月','日'];
		this.autoHide = setting.autoHide || false;
		this.shiftLeft = setting.shiftLeft || 100;
		this.filter = setting.filter || function (){return false;};
		this.init();		
	}
	function loadCss(){
		var head = document.getElementsByTagName('head')[0],
			link = document.createElement('link'),
			script = head.getElementsByTagName('script')[0];
		link.rel ='stylesheet';
		link.href = 'css/simple_calendar.css';
		if(script)
			head.insertBefore(link,script);
		else
			head.appendChild(link);
	}
	if(!cssLoaded)
		loadCss();
	global.SimpleCalendar = SimpleCalendar;
	SimpleCalendar.prototype = {
		constructor : SimpleCalendar,
		init : function (){
			this.createCal();
			this.monthOffset = 0;
			this.fillCal();
			this.addHandler();
			this.activateBtns();
			if(this.input)
				this.respondToClick();
		},
		createCal : function (){
			this.cal = document.createElement('div');
			this.cal.className = 'm-simple-cal';
			if(!this.input)
				this.cal.className += ' m-cal-static';
			this.cal.innerHTML = '<div class="m-cal-head"><div class="m-cal-month">2015年10月</div><a href="javascript:;" class="m-cal-prev"></a><a href="javascript:;" class="m-cal-next"></a></div><ol class="m-cal-week"><li>周一</li><li>周二</li><li>周三</li><li>周四</li><li>周五</li><li class="m-cal-weekend">周六</li><li class="m-cal-weekend">周日</li></ol><ol class="m-cal-days"></ol>';
			this.month = this.cal.querySelector('.m-cal-month');
			this.btnPrev = this.cal.querySelector('.m-cal-prev');
			this.btnNext = this.cal.querySelector('.m-cal-next');
			this.dayList = this.cal.querySelector('.m-cal-days');
			this.listLen = 42;
			if(this.input){
				this.input.parentNode.appendChild(this.cal);
				this.cal.style.top = this.input.offsetHeight + this.input.offsetTop + 'px';
			}else
				this.parent.appendChild(this.cal);
		},
		fillCal : function (){
			this.dayList.innerHTML = '';
			var date = new Date();
			date.setMonth(date.getMonth() + this.monthOffset);
			var year = date.getFullYear(),
				month = date.getMonth() + 1,
				today = date.getDate(),
				lastDay = new Date(year,month,0),
				daysOfMonth = lastDay.getDate(),
				lastDayOfMonth = lastDay.getDay(),
				firstDayOfMonth = new Date(year,month - 1,1).getDay() || 7,
				daysOfLastMonth = firstDayOfMonth - 1,
				startOfLastMonth = new Date(year,month - 1,0).getDate() - daysOfLastMonth + 1,
				daysOfNextMonth = this.listLen - daysOfLastMonth - daysOfMonth,
				firstDayOfNextMonth = (daysOfMonth + daysOfLastMonth)%7 + 1,
				frag = document.createDocumentFragment(),
				li,
				rem;
			this.month.innerHTML = date.getFullYear() + '年' + toTens(month) + '月';
			for(var i = 0;i < daysOfLastMonth;i++){
				li = document.createElement('li');
				li.className = 'm-cal-lastM';
				if(i === 5)
					li.className += ' m-cal-weekend';
				li.innerHTML = startOfLastMonth + i;
				frag.appendChild(li);
			}
			for(i = 0;i < daysOfMonth;i++){
				li = document.createElement('li');
				rem = (firstDayOfMonth + i)%7;
				if(rem === 0 || rem === 6)
					li.className = 'm-cal-weekend';
				if(!this.monthOffset && i === today - 1){
					li.className += ' m-cal-today';
					li.innerHTML = '今天';
				}else{
					li.innerHTML = (i + 1);
				}
				if(this.filter(year,month,i+1))
					li.className += ' m-cal-sp';
				frag.appendChild(li);
			}
			for(i = 0;i < daysOfNextMonth;i++){
				li = document.createElement('li');
				rem = (firstDayOfNextMonth + i)%7;
				li.className = 'm-cal-nextM';
				if(rem === 0 || rem === 6)
					li.className += ' m-cal-weekend';
				li.innerHTML = (i + 1);
				frag.appendChild(li);
			}
			this.dayList.appendChild(frag);
		},
		addHandler : function (){
			var that = this;
			addEvent(this.dayList,'mousedown',function (e){
				e.preventDefault();
			});
			addEvent(this.dayList,'click',function (e){
				var target = e.target,
					date = new Date(),
					dst = date.getMonth() + that.monthOffset,
					d;
				if(target.tagName === 'LI'){
					if(target.className.indexOf('m-cal-lastM') !== -1){
						dst--;
					}else if(target.className.indexOf('m-cal-nextM') !== -1){
						dst++;
					}
					date.setMonth(dst);
					if(target.innerHTML === '今天')
						d = date.getDate();
					else
						d = target.innerHTML;
					if(that.input){
						that.input.value = date.getFullYear() + that.format[0] + toTens(date.getMonth() + 1) + that.format[1] + toTens(d) + that.format[2];
						that.autoHide && (that.cal.style.display = 'none');
					}
					if(that.handler)
						that.handler.call(target,date.getFullYear(),(date.getMonth() + 1),+d);
				}
			});
		},
		activateBtns : function (){
			var that = this,
				timer;
			function _down(offset){
				var interval = 250;
				that.monthOffset += offset;
				that.fillCal();
				timer = setTimeout(function fn(){
					that.monthOffset += offset;
					that.fillCal();
					interval = interval - 50 || 50;
					timer = setTimeout(fn,interval);
				},interval);
			}
			this.btnPrev.onmousedown = function (){
				_down(-1);
			}
			this.btnNext.onmousedown = function (){
				_down(1);
			}
			this.btnPrev.onmouseup = this.btnNext.onmouseup = function (){
				clearTimeout(timer);
			}
		},
		respondToClick : function (){
			var that = this;
			addEvent(this.input,'click',function (e){
				that.cal.style.display = 'block';
				that.cal.style.left = e.offsetX + that.input.offsetLeft - that.shiftLeft + 'px';
			});
			addEvent(document,'click',function (e){
				var target = e.target;
				if(!that.cal.contains(target) && target !== that.input)
					that.cal.style.display = 'none';
			});
		}
	}
})(window);