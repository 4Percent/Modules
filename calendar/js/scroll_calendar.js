(function (global){
	var addEvent = global.addEventListener ? function (elt,event,handler){
			elt.addEventListener(event,handler,false);
		} : function (elt,event,handler){
			elt.attachEvent('on' + event,function (){
				var e = global.event;
				e.target = e.srcElement;
				handler.call(elt,e);
			});
		},
		mouseScroll = /firefox/i.test(global.navigator.userAgent) ? function (elt,handler){
			elt.addEventListener('DOMMouseScroll',function (e){
				handler.call(elt,e.detail > 0);
			},false);
		} : function (elt,handler){
			elt.addEventListener ? elt.addEventListener('mousewheel',function (e){
				handler.call(elt,e.wheelDelta < 0);
				e.preventDefault();
			},false) : elt.attachEvent('onmousewheel',function (){
				handler.call(elt,global.event.wheelDelta < 0);
				return false;
			},false);
		},
		getStyle = global.getComputedStyle ? function (elt,prop){
			return global.getComputedStyle(elt,'')[prop];
		} : function (elt,prop){
			return elt.currentStyle[prop];
		},
		requestFrame = global.requestAnimationFrame ? function (fn){
			return global.requestAnimationFrame(fn);
		} : function (fn){
			return setTimeout(fn,18);
		},
		cancelFrame = global.cancelRequestFrame ? function (timer){
			global.cancelRequestFrame(timer);
		} : function (timer){
			clearTimeout(timer);
		},
		cssLoaded = false;
	function loadCss(){
		var head = document.getElementsByTagName('head')[0],
			link = document.createElement('link'),
			script = head.getElementsByTagName('script')[0];
		link.rel = 'stylesheet';
		link.href = 'css/scroll_calendar.css';
		if(script)
			head.insertBefore(link,script);
		else
			head.appendChild(link);
		cssLoaded = true;
	}
	if(!cssLoaded)
		loadCss();
	function toTens(num){
		return num < 10 ? '0' + num : '' + num;
	}
	function ScrollCalendar(setting){
		setting = setting || {};
		this.input = setting.input;
		this.format = setting.format || ['年','月','日'];
		this.parent = setting.parent;
		this.handler = setting.handler;
		this.shiftLeft = setting.shiftLeft || 146;
		this.init();
	}
	global.ScrollCalendar = ScrollCalendar;
	ScrollCalendar.prototype = {
		constructor : ScrollCalendar,
		init : function (){
			this.createCal();
			this.enableScroll();
			this.addHandler();
		},
		createCal : function (){
			var that = this;
			this.cal = document.createElement('div');
			this.cal.className = 'm-scroll-cal';
			this.cal.innerHTML = '<div class="m-sc-head">选择日期</div><div class="m-sc-body"><ul class="m-sc-col m-sc-year"><li></li><li></li><li></li><li></li><li></li></ul><ul class="m-sc-col m-sc-month"><li></li><li></li><li></li><li></li><li></li></ul><ul class="m-sc-col m-sc-date"><li></li><li></li><li></li><li></li><li></li></ul></div><a href="javascript:;" class="m-sc-confirm">确 定</a>';
			var lists = this.cal.getElementsByTagName('ul'),
				top;
			this.btn = this.cal.querySelector('.m-sc-confirm');
			this.lists = {year:lists[0],month:lists[1],day:lists[2]};
			this.curDate = new Date();
			if(this.input)
				this.input.parentNode.appendChild(this.cal);
			else{
				this.cal.className += ' m-sc-static';
				this.parent.appendChild(this.cal);
			}
			this.years = this.lists.year.children;
			this.months = this.lists.month.children;
			this.days = this.lists.day.children;
			this.liHeight = parseFloat(getStyle(this.lists.year.children[0],'height'));
			this.opFactor = 1/this.liHeight/2;
			this.opMid = this.liHeight;
			for(var i = 0;i < this.years.length;i++){
				top = (i - 1)*this.liHeight;
				this.years[i].style.top = this.months[i].style.top = this.days[i].style.top = top + 'px';
				this.years[i].style.opacity = this.months[i].style.opacity = this.days[i].style.opacity = 1 - Math.abs(top - this.opMid)*this.opFactor;
			}
			this.updateCal();
		},
		updateCal : function (){
			var baseYear = this.curDate.getFullYear() - 2,
				baseMonth = this.curDate.getMonth() - 2,
				baseDate = this.curDate.getDate() - 2,
				dstMonth = new Date(baseYear),
				dstDate = new Date(baseYear),
				top;
			for(var i = 0;i < this.years.length;i++){
				this.years[i].innerHTML = baseYear + i;
				dstMonth.setMonth(baseMonth + i);
				dstDate.setMonth(baseMonth + 2,baseDate + i);
				this.months[i].innerHTML = dstMonth.getMonth() + 1;
				this.days[i].innerHTML = dstDate.getDate();
			}
		},
		relocateLi : function (li,top){
			li.style.top = top + 'px';
			li.style.opacity = 1 - Math.abs(top - this.opMid)*this.opFactor;
		},
		listScroll : function (list,speed,flag,handler,update){
			var that = this,
				li,
				beaconTop;
			if(this[speed] > 0){
				for(var i = 0;i <= 4;i++){
					li = list.children[i];
					if(i === 1)
						beaconTop = li.offsetTop + this[speed];
					this.relocateLi(li,li.offsetTop + this[speed]);
				}
				if(beaconTop >= 25){
					list.insertBefore(list.children[4],list.children[0]);
					list.children[0].style.top = beaconTop - 100 + 'px';
					update(-1);
				}
				this[speed] *= .95;
			}else{
				for(var i = 4;i >= 0;i--){
					li = list.children[i];
					if(i === 3)
						beaconTop = li.offsetTop + this[speed];
					this.relocateLi(li,li.offsetTop + this[speed]);
				}
				if(beaconTop <= 75){
					list.appendChild(list.children[0]);
					list.children[4].style.top = beaconTop + 100 + 'px';
					update(1);
				}
				this[speed] *= .95;
			}
			if(Math.abs(this[speed]) > .5)
				requestFrame(function (){
					that[handler]();
				});
			else{
				this[flag] = false;
				this.endScroll(list);
			}
		},
		endScroll : function (list){
			var totalFrames = 20,
				curFrame = 0,
				base = list.children[0].offsetTop,
				incre = -this.liHeight - base,
				that = this;
			this.timerEnd = requestFrame(function fn(){
				var top;
				curFrame++;
				top = base + (1 - Math.pow(1 - curFrame/totalFrames,3))*incre;
				if(Math.round(top) !== -that.liHeight){
					that.timerEnd = requestFrame(fn);
				}else{
					top = -that.liHeight;
				}
				for(var i = 0;i < list.children.length;i++){
					that.relocateLi(list.children[i],top + i*that.liHeight);
				}
			});
		},
		yearScroll : function (){
			var that = this;
			this.listScroll(this.lists.year,'yearSpeed','yearMoving','yearScroll',function (value){
				that.curDate.setYear(that.curDate.getFullYear() + value);
				that.updateCal();
			});
		},
		monthScroll : function (){
			var that = this;
			this.listScroll(this.lists.month,'monthSpeed','monthMoving','monthScroll',function (value){
				that.curDate.setMonth(that.curDate.getMonth() + value);
				that.updateCal();
			});
		},
		dayScroll : function (){
			var that = this;
			this.listScroll(this.lists.day,'daySpeed','dayMoving','dayScroll',function (value){
				that.curDate.setDate(that.curDate.getDate() + value);
				that.updateCal();
			});
		},
		enableScroll : function (){
			var that = this;
			this.speedIncre = 4;
			for(var prop in this.lists){
				(function (){
					var name = prop,
						list = that.lists[name],
						speed = name + 'Speed';
					mouseScroll(list,function (downwards){
						if(!that[name + 'Moving']){
							cancelFrame(that.timerEnd);
							that[speed] = downwards ? that.speedIncre : -that.speedIncre;
							that[name + 'Scroll']();
							that[name + 'Moving'] = true;
						}else{
							if(that[speed] > 0 && downwards){
								that[speed] += that.speedIncre;
								that[speed] > 20 && (that[speed] = 20);
							}else if(that[speed] < 0 && !downwards){
								that[speed] += -that.speedIncre;
								that[speed] < -20 && (that[speed] = -20);
							}else
								that[speed] = downwards ? that.speedIncre : -that.speedIncre;
						}
					});
				})();
			}
		},
		addHandler : function (){
			var that = this;
			if(this.handler)
				addEvent(this.btn,'click',function (){
					that.handler(that.curDate.getFullYear(),that.curDate.getMonth()+1,that.curDate.getDate());
				});
			if(this.input){
				addEvent(this.btn,'click',function (e){
					that.input.value = that.curDate.getFullYear() + that.format[0] + toTens(that.curDate.getMonth() + 1) + that.format[1] + toTens(that.curDate.getDate()) + that.format[2];
					that.cal.style.display = 'none';
				});
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
	}
})(window);