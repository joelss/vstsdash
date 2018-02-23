import { Vsts } from './vsts';

import * as $ from 'jquery';
import 'fullcalendar';

var app = new Vue({
    el: '#app',
    data: {
      status: 'Starting...',
      recentActivities: [],
    }
});

var queryId = '';
var vstsToken = '';
var vstsSiteName = 'cseng';
var vstsProjectName = 'CSEng';

let start = async () => {
    let vsts = new Vsts(vstsToken, vstsSiteName, vstsProjectName);
    app.status = 'Loading activity list...';
    let activityIds = await vsts.queryWorkItems(queryId);
    app.status = 'Loading activities...';
    let activities = await vsts.expandWorkItems(activityIds);
    app.status = 'Loading Projects & Partners...';
    let projectIds = await vsts.queryWorkItems('4218624d-d89d-46a0-8c62-450f5319f40e');
    app.status = 'Loading project details...';
    let projects = await vsts.expandWorkItems(projectIds);

    vsts.mapParents(activities, projects);
    vsts.validateWorkItems(activities);

    activities = _.orderBy(activities, ['date'], ['desc']);
    for(let activity of activities) {
        app.recentActivities.push(activity);
    }
    app.status = '';

    //renderCalendar(app.recentActivities);
}

start();



function renderCalendar(activities:any[]) {
    let containerEl = $('#calendar');

    let events = new Array();
    for(let activity of activities) {
        let e:any = {};
        e.title = activity.fields['System.Title'];
        e.start = activity.fields['CSEngineering.ActivityStartDate'].substr(0,10);
        events.push(e);
    }

  containerEl.fullCalendar({
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month,agendaWeek,agendaDay,listWeek'
    },
    defaultDate: (new Date()).toDateString(),
    navLinks: true, // can click day/week names to navigate views
    editable: false,
    eventLimit: false, // allow "more" link when too many events
    events: events
  })
}