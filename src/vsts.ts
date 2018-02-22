import axios from 'axios';
import * as _ from "lodash";
import { WorkItem } from './workItem';

export class Vsts {
    vstsToken:string;
    vstsSiteName:string;
    vstsProjectName:string;

    readonly authHeader:string;

    cache: { [key: string]: WorkItem };

    constructor(vstsToken:string, vstsSiteName:string, vstsProjectName:string) {
        this.vstsToken = vstsToken;
        this.vstsSiteName = vstsSiteName;
        this.vstsProjectName = vstsProjectName;

        this.authHeader = 'Basic ' + btoa(':' + this.vstsToken);

        this.cache = {};
    }

    async queryWorkItems(queryGuid:string) {
        console.log('Querying the work item ids using query '+  queryGuid);
        
        var vstsQueryPath = 'https://' + this.vstsSiteName + '.visualstudio.com/DefaultCollection/' + this.vstsProjectName + '/_apis/wit/wiql/' + queryGuid;
    
        var options = {
            //method: 'GET',
            url: vstsQueryPath,
            json: true,
            headers: 
            {
                authorization: this.authHeader
            }
        };

        let response = await axios(options);

        if(response.status !== 200) {
            return null;
        }

        let workItemIds = _.map(response.data.workItems, 'id');
        console.log('Loaded ' + workItemIds.length + ' work items');

        return workItemIds as Array<number>;
    }

    async expandWorkItems(workItemIds:number[]) {
        if(workItemIds.length > 200) {
            console.warn('Loading more than 200 work items is not supported yet!');
            workItemIds = workItemIds.slice(0, 200);
        }

        console.log('Querying the work item details');

        let fields = new Array<string>();
        fields.push('System.Id');
        fields.push('CSEngineering.ActivityStartDate');
        fields.push('CSEngineering.ActivityDuration');
        fields.push('System.Title');
        fields.push('System.Tags')
        fields.push('System.relations');

        //fields=System.Id,System.Title,System.WorkItemType,Microsoft.VSTS.Scheduling.RemainingWork
    
        var options = {
            url: 'https://' + this.vstsSiteName + '.visualstudio.com/DefaultCollection/_apis/wit/workitems',
            params: {
                ids: workItemIds.join(','),
                'api-version': '1.0',
                'fields': fields.join(','),
                //'$expand': 'relations',
            },
            json: true,
            headers: 
            {
                authorization: this.authHeader
            }
        }
    
        let response = await axios(options);
        let rawWorkItems = response.data.value;
        let workItems = new Array<WorkItem>();

        for(let wi of rawWorkItems) {
            let w = new WorkItem();

            w.id = wi.id;
            w.date = new Date(Date.parse(wi.fields['CSEngineering.ActivityStartDate'].substr(0,10)));
            w.duration = parseInt(wi.fields['CSEngineering.ActivityDuration']);
            w.title = wi.fields['System.Title'];
            w.url = wi.url;

            if(wi.relations && wi.relations.length > 0) {
                let url = wi.relations[0].url;
                let r = new RegExp(/.*\/([0-9]+)/g);

                let parts = r.exec(url);
                w.parentId = parseInt(parts[1]);
            }

            if(w.parentId in this.cache) {
                w.parent = this.cache[w.parentId];
            }

            this.validateWorkItem(w);
            workItems.push(w);
            this.addToCache(w);
        }

        return workItems;
    }

    addToCache(workItem:WorkItem) {
        if(!(workItem.id in this.cache)) {
            this.cache[workItem.id] = workItem;
        }
    }

    validateWorkItem(workItem:WorkItem) {
        if(!workItem.parentId) {
            workItem.validationErrors.push("Missing Parent");
        }
    }
}