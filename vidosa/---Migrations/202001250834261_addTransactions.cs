namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addTransactions : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Transactions",
                c => new
                    {
                        TransId = c.Int(nullable: false, identity: true),
                        GrossAmount = c.Decimal(nullable: false, precision: 18, scale: 2),
                        PaymentId = c.String(),
                        pf_PaymentId = c.String(),
                        AmountFee = c.Decimal(nullable: false, precision: 18, scale: 2),
                        AmountNet = c.Decimal(nullable: false, precision: 18, scale: 2),
                        TransDate = c.DateTime(nullable: false),
                        TransStatus = c.String(),
                        UserId = c.Int(nullable: false),
                    })
                .PrimaryKey(t => t.TransId);
            
            AddColumn("dbo.PremiumSubs", "Token", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.PremiumSubs", "Token");
            DropTable("dbo.Transactions");
        }
    }
}
