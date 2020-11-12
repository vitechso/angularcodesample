import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from './../../../shared/services/product.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-order-details',
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss']
})
export class OrderDetailsComponent implements OnInit {
  
  orderId:any;
  orderDetails:any;
  statusDetails: any;
  ordered: boolean = false;
  orderPacked: boolean = false;
  orderShipped: boolean = false;
  delivered: boolean = false;
  orderDate: any;
  orderPackedDate: any;
  orderShippedDate: any;
  deliveredDate: any;
  orderedDescription: any;
  orderPackedDescription: any;
  orderShippedDescription: any;
  deliveredDescription: any;
  states:any=[];
  returnProductDetails: any;
  returnedProducts:any=[];
  constructor(private productService:ProductService,private toastService:ToastrService,private route: ActivatedRoute) { 
    this.route.params.subscribe(params =>{
      console.log(params);
      this.orderId = params.id;
      this.getOrderDetails()
    })
  }

  getOrderDetails() {
    
    this.productService.getOrderDetail({"order_id":this.orderId}).subscribe(res=>{
      console.log(res);
      this.orderDetails = res['data'];
      this.returnProductDetails = (this.orderDetails && this.orderDetails.ReturnSalesLineBuffer_json!='')?JSON.parse(this.orderDetails.ReturnSalesLineBuffer_json):'';
      console.log(this.returnProductDetails);
      if(this.orderDetails && this.orderDetails.ReturnSalesLineBuffer_json){
        this.returnProductDetails.forEach(element => {
          console.log(element);
          this.returnedProducts.push(element.Variant_Code);
        });
      }
      this.productService.getOrderStatusList({"order_id":this.orderDetails.No}).subscribe(res=>{
        console.log(res);
        if(res && res['data']){
          this.statusDetails = res['data'];
          // this.statusDetails.forEach(element => {
          //   console.log(element);
          //   if(element.status == 'Ordered'){
          //     this.ordered = true;
          //     this.orderDate = element.date;
          //     this.orderedDescription = element.description;
          //   }
            
          //   if(element.status == 'Order Packed'){
          //     this.orderPacked = true;
          //     this.orderPackedDate = element.date;
          //     this.orderPackedDescription = element.description;
          //   }

          //   if(element.status == 'Shipped'){
          //     this.orderShipped = true;
          //     this.orderShippedDate = element.date;
          //     this.orderShippedDescription = element.description
          //   }

          //   if(element.status == 'Delivered'){
          //     this.delivered = true;
          //     this.deliveredDate = element.date;
          //     this.deliveredDescription = element.description
          //   }
          // });
        }else{
          this.statusDetails = [];
          this.delivered = false;
          this.ordered=false;
          this.orderShipped =false;
          this.orderPacked=false
        }
        
      })
    })
  }

  ngOnInit(): void {
  }

  returnProduct(item){
    let obj1 = {"Document_Type":"Order",
    "Type":"Item",
    "No":"P001727",
    "Variant_Code":item.Variant_Code,
    "Description":item.Parant_Description,
    "Unit_of_Measure":item.Unit_of_Measure,
    "Quantity":item.Quantity,
    "Unit_Price":item.Unit_Price,
    "Net_Amount":item.Net_Amount,
    "Amount_Include_GST":item.Amount_Include_GST,
    "Line_Discount_Percent":item.Line_Discount_Percent,
    "Line_Discount_Amount":item.Line_Discount_Amount,
    "Parant_Code":item.Parant_Code,
    "Parant_Description":item.Parant_Description};
    let obj = {
      "user_id":localStorage.customerId,
      "No":this.orderDetails.No,
      "order_id":this.orderDetails.id,
      "SalesLineBuffer":[obj1]
    }
    console.log(obj);
    this.productService.returnSingleProduct(obj).subscribe(res=>{
      //console.log(res);
      this.productService.getOrderDetail({"order_id":this.orderId}).subscribe(res=>{
        console.log(res);
        this.orderDetails = res['data'];
        this.returnProductDetails = (this.orderDetails && this.orderDetails.ReturnSalesLineBuffer_json!='')?JSON.parse(this.orderDetails.ReturnSalesLineBuffer_json):'';
        console.log(this.returnProductDetails);
        if(this.orderDetails && this.orderDetails.ReturnSalesLineBuffer_json){
          this.returnProductDetails.forEach(element => {
            console.log(element);
            this.returnedProducts.push(element.Variant_Code);
          });
        }
        this.productService.getOrderStatusList({"order_id":this.orderDetails.No}).subscribe(res=>{
          console.log(res);
          if(res && res['data']){
            this.statusDetails = res['data'];
            // this.statusDetails.forEach(element => {
            //   console.log(element);
            //   if(element.status == 'Ordered'){
            //     this.ordered = true;
            //     this.orderDate = element.date;
            //     this.orderedDescription = element.description;
            //   }
              
            //   if(element.status == 'Order Packed'){
            //     this.orderPacked = true;
            //     this.orderPackedDate = element.date;
            //     this.orderPackedDescription = element.description;
            //   }
  
            //   if(element.status == 'Shipped'){
            //     this.orderShipped = true;
            //     this.orderShippedDate = element.date;
            //     this.orderShippedDescription = element.description
            //   }
  
            //   if(element.status == 'Delivered'){
            //     this.delivered = true;
            //     this.deliveredDate = element.date;
            //     this.deliveredDescription = element.description
            //   }
            // });
          }else{
            this.statusDetails = [];
            this.delivered = false;
            this.ordered=false;
            this.orderShipped =false;
            this.orderPacked=false
          }
          
        })
      })
      this.toastService.success("Return Initiated");
    },error=>{
     this.toastService.error("Some error occured")
    })
    //this.productService.returnSingleProduct(item)
  }

}
