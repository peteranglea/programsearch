// TODO: more verbose inline documentation (sorry...)

var programsearch = {
	// variable to hold all major information as JSON
	programs: [],
	baseUrl: 'http://www.bju.edu',
	
	// Initialization
	init: function(){
		
		$.getJSON('js/programdata.json', function(data){
			programsearch.programs = data;
		});
		
		// Assign key actions to search field
		$('#program').keyup(function(e){
			//account for arrow keystrokes
			if (e.keyCode == 40) { // down arrow
				if ($('#results li.active').length == 0) $('#results ul li:first-child').addClass('active');
				else {
					$('#results li.active').addClass('prev').removeClass('active').next().addClass('active');
					$('#results li.prev').removeClass('prev');
				}
			} else if (e.keyCode == 38) { // up arrow
				if ($('#results li.active').length == 0) $('#results ul li:last-child').addClass('active');
				else {
					$('#results li.active').addClass('prev').removeClass('active').prev().addClass('active');
					$('#results li.prev').removeClass('prev');
				}
			} else if (e.keyCode == 13) { // enter
				if ($('#results li.active').length == 0) return;
				else $('#results li.active a').click();
			} else if (e.keyCode == 39) {
				if ($('#results li.active').hasClass('tag')) {
					$('#results li.active a').click();
				}
			} else {
				// clear any timeouts for failed queries
				if (typeof programsearch.queryFailTimeout == "number") {
					window.clearTimeout(programsearch.queryFailTimeout);
					delete programsearch.queryFailTimeout;
				}
				// perform new search
				programsearch.searchPrograms($(this).val());
			}
			
			programsearch.showHideLabel();
			
		});
		
		$('#program').keydown(function(e){
			if (e.keyCode != 16) {
				$('#programsearch label').hide();
			}
		});
		
		// Assign click action to clearing "X"
		$('#programclear').click(function(){
			if ($(this).hasClass('clear')) $('#program').val('').keyup().focus();
		});
		
		programsearch.showHideLabel();
	},
	
	showHideLabel: function() {
		if ($('#program').val() == '') {
			$('#programsearch label').show();
			$('#programclear').addClass('search').removeClass('clear');
		} else {
			$('#programsearch label').hide();
			$('#programclear').addClass('clear').removeClass('search');
		}
	},
	
	searchPrograms: function(query) {
		var regexp = eval('/'+query+'/gi');
		var results = [];
		if (query != "") {
			// find degrees that match the query
			$.each(programsearch.programs, function(){
				if (this.major_name.search(regexp) != -1 || 
					(typeof this.keywords != "undefined" && this.keywords != null && this.keywords.search(regexp) != -1) ||
					(typeof this.tags != "undefined" && this.tags.search(regexp) != -1) ||
					(typeof this.concentrations != "undefined" && this.concentrations.search(regexp) != -1)
					){
					var result = {
						'type':'major',
						'major_id':this.major_id,
						'text':this.major_name,
						'url':this.url
					};

					result.rank = programsearch.getRank(this, query, 'major');
					results.push(result);
				}
			});
		}
		// sort by rank, alphabetical
		results.sort(function(a,b){
			if (a.rank > b.rank) return 1;
			else if (a.rank < b.rank) return -1;
			else {
				if (a.text.toLowerCase() > b.text.toLowerCase()) return 1;
				else return -1;
			}
		});
		programsearch.displayResults(results, regexp);
	},
	
	getRank: function(result, query, type) {
		var regexp = eval('/'+query+'/gi');
		var regexp2 = eval('/\\s'+query+'/gi'); // query preceded by whitespace (start of a new word)
		if (type == 'major') {
			var regexp_pos = result.major_name.search(regexp);
			// 1. Match on the first character of a major name
			if (regexp_pos == 0) return 1;
			// 3. Query begins a new word
			else if (result.major_name.search(regexp2) != -1) return 3;
			// 5. Match anywhere in major name
			else if (regexp_pos != -1) return 5;
			// 6. Tag match
			else if (typeof result.tags != "undefined" && result.tags.search (regexp) != -1) return 6;
			// 7. Principal/Concentration match
			else if (typeof result.concentrations != "undefined" && result.concentrations.search (regexp) != -1) return 7;
			// 8. Keyword match
			else if (typeof result.keywords != "undefined" && result.keywords.search (regexp) != -1) return 8;
			else return 10;
		}
	},
	
	displayResults: function(results, regexp) {
		if ($.isEmptyObject(results)){
			var query = $('#program').val();
			if (query != "") {
				var html = '<ul>';
				html += "<li class='search active' data-value='" + query + "'><a href='" + programsearch.baseUrl + "/gc-search/?cx=017456826151234432158%3Auxwdfipsr-u&cof=FORID%3A10&ie=UTF-8&q=" + query + "'>Search BJU.edu for <strong>" + query + "</strong></a></li>";
				html += "</ul>";
				$('#results').html(html);

				// activate click actions
				$('#results li a').click(function(e){
					if ($(this).parent().hasClass('search')) {
						e.preventDefault();
						programsearch.trackEvent('Site Search', query);
						window.location = $(this).attr('href');
					}
				});
				
				// register a failed query after 1 sec.
				programsearch.queryFailTimeout = window.setTimeout(function() {
					programsearch.trackEvent('No Results', query);
				},1000);
			} else {
				$('#results').html('');
			}
		} else {
			var html = '<ul>';
			if (regexp == '') {
				html += "<li class='back'><a href='javascript:;'>Back</a></li>";
			}
			var count = 0;
			$.each(results, function() {
				if (regexp != '' && count >= 10) return;
				
				if (this.type == 'tag') var data = this.text;
				else if (this.type == 'faux') var data = this.url;
				else var data = this.major_id;
				
				if (regexp == '') html += "<li class='" + this.type + "' data-value='" + data + "'><a href='" + programsearch.baseUrl + this.url + "'>" + this.text + "</a></li>";
				else html += "<li class='" + this.type + "' data-value='" + data + "'><a href='" + programsearch.baseUrl + this.url + "'>" + this.text.replace(regexp, "<strong>" + '$&' + "</strong>") + "</a></li>";
				count++;
			});
			html += "</ul>";
			$('#results').html(html);
			$('#results ul li:first-child').addClass('active');
			
			// activate click actions
			$('#results li a').click(function(e){
				if ($(this).parent().hasClass('tag')) {
					displayMajorsByTag($(this).parent().attr('data-value'));
				} else if ($(this).parent().hasClass('back')){
					searchPrograms($('#program').val());
				} else {
					e.preventDefault();
					programsearch.trackEvent($(this).text(), $('#program').val());
					window.location = $(this).attr('href');
				}
			});
		}
	},
	
	// Google Analytics tracking. What they typed and what they clicked, or what they typed and got nothing for.
	trackEvent: function(key, value) {
		if (typeof ga != "undefined") {
			ga('send', 'event', 'Program Search', key, value);
			//console.log([key, value]);
		}
	}
}