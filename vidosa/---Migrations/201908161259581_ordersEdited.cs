namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class ordersEdited : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Orders",
                c => new
                    {
                        OrderId = c.Int(nullable: false, identity: true),
                        CustId = c.Int(nullable: false),
                        ProductId = c.Int(nullable: false),
                        PaymentId = c.String(),
                        pf_PaymentId = c.String(),
                        IsSubscription = c.Boolean(nullable: false),
                        IsPaid = c.Boolean(nullable: false),
                        ItemName = c.String(),
                        Description = c.String(),
                        Amount = c.Decimal(nullable: false, precision: 18, scale: 2),
                        GrossAmount = c.Decimal(nullable: false, precision: 18, scale: 2),
                        AmountFee = c.Decimal(nullable: false, precision: 18, scale: 2),
                        AmountNet = c.Decimal(nullable: false, precision: 18, scale: 2),
                        PaymentStatus = c.String(),
                        OrderDate = c.DateTime(nullable: false),
                        PaymentDate = c.DateTime(nullable: false),
                        Token = c.String(),
                    })
                .PrimaryKey(t => t.OrderId);
            
        }
        
        public override void Down()
        {
            DropTable("dbo.Orders");
        }
    }
}
