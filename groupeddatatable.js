/**
* Adds grouping functionality to a YUI DataTable.
* http://datatablegrouper.codeplex.com
*
* Copyright (c) 2009 Anthony Super
* http://antscode.blogspot.com
*
* @class DataTableGrouper
* @contructor
* @param groupBy {string} The data field to group by.
*/
var DataTableGrouper = function(groupBy) {
    var dom = YAHOO.util.Dom,
        event = YAHOO.util.Event;
	var DT = YAHOO.widget.DataTable;
    /**
    * A reference to the current class instance.
    * @property _this
    * @type {Object}
    * @private
    */
    var _this = this;

    /**
    * The YUI data table associated with this object.
    * @property dataTable
    * @type {Object}
    * @private
    */
    this.dataTable = null;

    /**
    * The current group name. Used to determine when a new group starts when rowFormatter is called.
    * @property currentGroupName
    * @type {String}
    * @private
    */
    this.currentGroupName = null;

    /**
    * The groups found in the current data set.
    * @property groups
    * @type {Array}
    * @private
    */
    this.groups = [];

    /**
    * A flag to reset the group array. Set each time a new data set is passed.
    * @property resetGroups
    * @type {Boolean}
    * @private
    */
    this.resetGroups = true;

    /**
    * Event handler for group click.
    * @property groupClickEvent
    * @type {Event}
    */
    this.onGroupClick = new YAHOO.util.CustomEvent("onGroupClick", this);

    /**
    * The currently selected group
    * @property groupClickEvent
    * @type {Event}
    */
    this.selectedGroup = null;

    /**
    * Initialises the grouper.
    * @method init
    * @param parent {Object} The YUI DataTable to apply the grouping to.
    */
    this.init = function(dataTable) {
        this.dataTable = dataTable;
		this.dataTable.sortColumn = this.sortColumn;
		this.dataTable.grouper = this; 
        // Initialise the groups
        this.initGroups(); /* Not required but prevents flickering */

        // Re-initialise the groups when data is changed
        dataTable.subscribe("sortedByChange", function() { _this.initGroups() }); /* Not required but prevents flickering */
        dataTable.subscribe("renderEvent", function() { _this.initGroups() });

        // Update group widths when columns are resized
        dataTable.subscribe("columnSetWidthEvent", function() { _this.resizeGroups() });

        // Unselect any group when a row is clicked
        dataTable.subscribe("rowClickEvent", function() { _this.unselectGroup() });
    }

    /**
    * A YUI DataTable custom row formatter. The row formatter must be applied to the DataTable
    * via the formatRow configuration property.
    * @method rowFormatter
    * @param tr {Object} To row to be formatted.
    * @param record {Object} To current data record.
    */
    this.rowFormatter = function(tr, record) {
        if (this.resetGroups) {
            this.groups = [];
            this.currentGroupName = null;
            this.resetGroups = false;
        }

        var groupName = record.getData(groupBy);

        if (groupName != this.currentGroupName) {
            this.groups.push({ name: groupName, row: tr, group: null, recdset:[] });
            dom.addClass(tr, "group-first-row");
        } 
        var recdset = this.groups[this.groups.length - 1].recdset;
        recdset.push(record);        	        

        this.currentGroupName = groupName;
        return true;
    };

    /**
    * Initialises the groups for the current data set.
    * @method initGroups
    * @private
    */
    this.initGroups = function() {
        if (!this.resetGroups) {
            // Insert each group in the array
            for (var i = 0; i < this.groups.length; i++) {
                this.groups[i].group = this.insertGroup(this.groups[i].name, this.groups[i].row);
            }

            this.resetGroups = true;
        }
    }

    /**
    * Updates the width of all groups to match the data table.
    * @method resizeGroups
    * @private
    */
    this.resizeGroups = function() {
        // Insert each group in the array
        for (var i = 0; i < this.groups.length; i++) {
            this.setGroupWidth(this.groups[i].group, this.groups[i].row);
        }
    }

    /**
    * Sets the width of a group to the parent row width.
    * @method resizeGroups
    * @param group {Object} To group to set width to.
    * @param row {Object} To row to get width from.
    * @private
    */
    this.setGroupWidth = function(group, row) {
        group.style.width = dom.getRegion(row).width + "px";
    }

    /**
    * Inserts a group before the specified row.
    * @method insertGroup
    * @param name {String} The name of the group.
    * @param beforeRow {Object} To row to insert the group.
    * @private
    */
    this.insertGroup = function(name, row) {
        var group = document.createElement("div");
        var icon = document.createElement("div");

        // Row is expanded by default
        group.className = "group group-expanded";

        if (dom.hasClass(row, "yui-dt-first")) {
            // If this is the first row in the table, transfer the class to the group
            dom.removeClass(row, "yui-dt-first");
            dom.addClass(group, "group-first");
        }

        // Add a liner as per standard YUI cells
        var liner = document.createElement("div");
        liner.className = "liner";

        // Add icon
        icon.className = "icon";
        liner.appendChild(icon);

        // Add label
        var label = document.createElement("div");
        label.innerHTML = name;
        label.className = "label";
        liner.appendChild(label);
        group.appendChild(liner);

        // Set the width of the group
        this.setGroupWidth(group, row);

        // Insert the group
        for (var i  =0; i < row.cells.length;i++) {
	        var cell = row.cells[i];
	        if (!dom.hasClass(cell, "yui-dt-hidden")) {
    	    	dom.insertBefore(group, cell.childNodes[0]);
    	    	break;
	        }
        }

        // Attach visibility toggle to icon click
        event.addListener(icon, "click", function(e) { _this.toggleVisibility(e) });

        // Attach group click event handler
        event.addListener(group, "click", function(e) { _this.handleGroupClick(e) });

        return group;
    }

    /**
    * Handles the group click event.
    * @method handleGroupClick
    * @param e {Event} The event fired from clicking the group.
    * @private
    */
    this.handleGroupClick = function(e) {
        var group = dom.getAncestorByClassName(event.getTarget(e), "group");

        // Fire the onGroupClick event
        this.onGroupClick.fire(group);

        // Stop the event to prevent the row from being selected
        event.stopEvent(e);
        return false;
    }

    /**
    * Handles the group select event.
    * @method onEventSelectGroup
    * @param type {String} The type of event fired.
    * @param e {Object} The selected group.
    * @private
    */
    this.onEventSelectGroup = function(type, group) {
        this.selectGroup(group);
    }

    /**
    * Selects a group.
    * @method selectGroup
    */
    this.selectGroup = function(group) {
        // Unselect any previous group
        this.unselectGroup();

        // Select the new group
        dom.addClass(group, "group-selected");
        this.selectedGroup = group;

        // Unselect all rows in the data table
        var selectedRows = this.dataTable.getSelectedTrEls();

        for (var i = 0; i < selectedRows.length; i++) {
            this.dataTable.unselectRow(selectedRows[i]);
        }
    }

    /**
    * Unselects any selected group.
    * @method unselectGroup
    */
    this.unselectGroup = function() {
        if (this.selectedGroup) {
            dom.removeClass(this.selectedGroup, "group-selected");
        }
    }

    /**
    * Toggles the visibility of the group specified in the event.
    * @method toggleVisibility
    * @param e {Event} The event fired from clicking the group.
    * @private
    */
    this.toggleVisibility = function(e) {
        var group = dom.getAncestorByClassName(event.getTarget(e), "group");
        var row = dom.getAncestorByTagName(group, "tr");
        var visibleState;

        // Change the class of the group
        if (dom.hasClass(group, "group-expanded")) {
            visibleState = false;
            dom.replaceClass(group, "group-expanded", "group-collapsed");
        }
        else {
            visibleState = true;
            dom.replaceClass(group, "group-collapsed", "group-expanded");
        }

        // Change the class of the first row
        if (!visibleState) {
            dom.replaceClass(row, "group-first-row", "group-first-row-collapsed");
        }
        else {
            dom.replaceClass(row, "group-first-row-collapsed", "group-first-row");
        }

        // Hide all subsequent rows in the group
        row = dom.getNextSibling(row);

        while (row && !dom.hasClass(row, "group-first-row") &&
            !dom.hasClass(row, "group-first-row-collapsed")) {
            if (visibleState) {
                row.style.display = "block";
            }
            else {
                row.style.display = "none";
            }

            row = dom.getNextSibling(row);
        }
    }
 	this.sortColumn = function(oColumn, sDir) {
	    if(oColumn && (oColumn instanceof YAHOO.widget.Column)) {
	        if(!oColumn.sortable) {
	            Dom.addClass(this.getThEl(oColumn), DT.CLASS_SORTABLE);
	        }
	        
	        // Validate given direction
	        if(sDir && (sDir !== DT.CLASS_ASC) && (sDir !== DT.CLASS_DESC)) {
	            sDir = null;
	        }
	        
	        // Get the sort dir
	        var sSortDir = sDir || this.getColumnSortDir(oColumn);
	
	        // Is the Column currently sorted?
	        var oSortedBy = this.get("sortedBy") || {};
	        var bSorted = (oSortedBy.key === oColumn.key) ? true : false;
	        var ok = this.doBeforeSortColumn(oColumn, sSortDir);
	        if(ok) {
	        	// Server-side sort
	            if(this.get("dynamicData")) {
	                // Get current state
	                var oState = this.getState();
	                
	                // Reset record offset, if paginated
	                if(oState.pagination) {
	                    oState.pagination.recordOffset = 0;
	                }
	                
	                // Update sortedBy to new values
	                oState.sortedBy = {
	                    key: oColumn.key,
	                    dir: sSortDir
	                };
	                
	                // Get the request for the new state
	                var request = this.get("generateRequest")(oState, this);
	
	                // Purge selections
	                this.unselectAllRows();
	                this.unselectAllCells();
	
	                // Send request for new data
	                var callback = {
	                    success : this.onDataReturnSetRows,
	                    failure : this.onDataReturnSetRows,
	                    argument : oState, // Pass along the new state to the callback
	                    scope : this
	                };
	                this._oDataSource.sendRequest(request, callback);            
	            }
	            // Client-side sort
	            else {
					// Sort the Records
	                if(!bSorted || sDir) {
	                    // Get the field to sort
	                    var sField = (oColumn.sortOptions && oColumn.sortOptions.field) ? oColumn.sortOptions.field : oColumn.field;
	                    // Is there a custom sort handler function defined?
	                    var sortFnc = (oColumn.sortOptions && lang.isFunction(oColumn.sortOptions.sortFunction)) ?
	                            // Custom sort function
	                            oColumn.sortOptions.sortFunction :
	        
	                            // Default sort function
	                            function(a, b, desc) {
	                                YAHOO.util.Sort.compare(a.getData(sField),b.getData(sField), desc);
	                                var sorted = YAHOO.util.Sort.compare(a.getData(sField),b.getData(sField), desc);
	                                if(sorted === 0) {
	                                    return YAHOO.util.Sort.compare(a.getCount(),b.getCount(), desc); // Bug 1932978
	                                }
	                                else {
	                                    return sorted;
	                                }
	                            };
	        			//for group sorting
	                      var grouper = this.grouper;
	                    //if (this.grouper && this.grouper.groups && !this.grouper.resetGroups) {        
	                      if (this.grouper && this.grouper.groups) {
		                    var groups = this.grouper.groups;
		                    var newrecs = [];
		                    for (var i = 0; i < groups.length;i++){
		                    	var recdsets = groups[i].recdset;
		                    	groups[i].recdset = recdsets.sort(function(a, b) {return sortFnc(a, b, (sSortDir == DT.CLASS_DESC) ? true : false);});
		                    	newrecs = newrecs.concat(recdsets);
		                    }
		                    this._oRecordSet._records = newrecs;
	                    } else {
	                    	this._oRecordSet.sortRecords(sortFnc, ((sSortDir == DT.CLASS_DESC) ? true : false));	                    	
	                    }
	                }
	                // Just reverse the Records
	                else {
	        			//for group sorting
	                	var grouper = this.grouper;
	                    //if (this.grouper && this.grouper.groups && !this.grouper.resetGroups) {        
	                	if (this.grouper && this.grouper.groups) {
		                	 var groups = this.grouper.groups;
		                    var newrecs = [];
		                    for (var i = 0; i < groups.length;i++){
		                    	var recdsets = groups[i].recdset;
		                    	groups[i].recdset = recdsets.reverse();
		                    	newrecs = newrecs.concat(recdsets);
		                    }
		                    this._oRecordSet._records = newrecs;
	                    } else {
	                    	this._oRecordSet.reverseRecords();
	                    }
	                }
	        
	                // Reset to first page if paginated
	                var oPaginator = this.get('paginator');
	                if (oPaginator) {
	                    // Set page silently, so as not to fire change event.
	                    oPaginator.setPage(1,true);
	                }
	        
	                // Update UI via sortedBy
	                this.render();
	                this.set("sortedBy", {key:oColumn.key, dir:sSortDir, column:oColumn}); 
		            this.fireEvent("columnSortEvent",{column:oColumn,dir:sSortDir});
	    	        YAHOO.log("Column \"" + oColumn.key + "\" sorted \"" + sSortDir + "\"", "info", this.toString());
		        }
	        }
	    }
 	}

 	this.newGroupBy  = function(newGroupName) {
			var newCol = this.dataTable.getColumnSet().getColumn(newGroupName);
			if (newCol) {
				var curCol = this.dataTable.getColumnSet().getColumn(groupBy);
				this.dataTable.hideColumn(newCol);
				this.dataTable.showColumn(curCol);
				groupBy = newGroupName;
				this.dataTable.grouper = null;
				 if (groupBy != newGroupName) {
             	   this.dataTable.sortColumn(curCol);//make sure new col is not the current sorted column
            	}
				this.dataTable.sortColumn(newCol);
				this.dataTable.grouper = this;
			}
	}

}