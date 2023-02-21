namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addPaymentIdOnSales : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Sales", "PaymentId", c => c.String());
            AddColumn("dbo.Sales", "IsPaid", c => c.Boolean(nullable: false));
        }
        
        public override void Down()
        {
            DropColumn("dbo.Sales", "IsPaid");
            DropColumn("dbo.Sales", "PaymentId");
        }
    }
}
