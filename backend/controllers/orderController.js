import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

//placing user order for frontend
export const placeOrder = async (req,res) => {

    const frontEndUrl = "https://food-delivery-frontend-11bu.onrender.com";

    try{
        const newOrder = new orderModel({
            userId: req.body.userId,
            items:req.body.items,
            amount: req.body.amount,
            address: req.body.address
        })

        await newOrder.save();
        await userModel.findByIdAndUpdate(req.body.userId,{cartData: {}});

        const line_items = req.body.items.map((item) =>({
            price_data:{
                currency:"inr",
                product_data:{
                    name:item.name
                },
                unit_amount:item.price*100*80,
            },
            quantity:item.quantity,
        }))

        line_items.push({
            price_data:{
                currency:"inr",
                product_data:{
                    name:"Delivery Charges"
                },
                unit_amount: 2 * 100 * 80,
            },
            quantity: 1,
        })

        const session = await stripe.checkout.sessions.create({
            line_items:line_items,
            mode:"payment",
            success_url: `${frontEndUrl}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontEndUrl}/verify?success=false&orderId=${newOrder._id}`,
        })


        res.json({success:true,session_url:session.url})

    }catch (error) {
        console.log("error placeOrder");
        res.json({success: false,message: "Error"})
    }
}

export const verifyOrder = async (req,res) => {
    const {orderId,success} = req.body;

    try {
        if(success == "true"){
            await orderModel.findByIdAndUpdate(orderId, {payment: true});
            res.json({success:true, message: "Paid"})
        }else{
            await orderModel.findByIdAndDelete(orderId);
            res.json({success:false,message: "Not Paid"})
        }
    } catch (error) {   
        console.log("Error Verify",error);
        res.json({success:false, message: "Error"});
    }

}

//user order for frontEnd
export const useOrders = async (req,res) => {
    try {
        const orders = await orderModel.find({userId: req.body.userId});
        res.json({success: true, data:orders});

    } catch (error) {
        console.log("error useOrders",error)
        res.json({success:false, message: "Error"});
    }
}

// Listing orders for admin panel
export const listOrders = async (req,res) => {

    try {
        const orders = await orderModel.find({});
        res.json({success:true, data: orders})
    } catch (error) {   
        console.log(error);
        res.json({success:false, message: "Error"})
    }
}

//api for updating order status 
export const updateStatus = async (req,res) => {
    try{
        await orderModel.findByIdAndUpdate(req.body.orderId, {status: req.body.status});
        res.json({success:true, message: "Status Updated"})
    }catch(error){
        console.log("error updateStatus",error)
        res.json({success:false, message: "Error"})
    }
}