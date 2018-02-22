export class WorkItem {
    id:number;
    date:Date;
    duration:number;
    title:string;
    url:string;
    parentId:number;
    parent:WorkItem;
    validationErrors: string[];

    constructor() {
        this.validationErrors = new Array<string>();
    }
}