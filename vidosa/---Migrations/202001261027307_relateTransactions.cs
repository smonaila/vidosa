namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class relateTransactions : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.TransactionsPremiumSubs",
                c => new
                    {
                        Transactions_TransId = c.Int(nullable: false),
                        PremiumSubs_Id = c.Int(nullable: false),
                    })
                .PrimaryKey(t => new { t.Transactions_TransId, t.PremiumSubs_Id })
                .ForeignKey("dbo.Transactions", t => t.Transactions_TransId, cascadeDelete: true)
                .ForeignKey("dbo.PremiumSubs", t => t.PremiumSubs_Id, cascadeDelete: true)
                .Index(t => t.Transactions_TransId)
                .Index(t => t.PremiumSubs_Id);
            
            CreateTable(
                "dbo.SalesTransactions",
                c => new
                    {
                        Sales_SaleId = c.Int(nullable: false),
                        Transactions_TransId = c.Int(nullable: false),
                    })
                .PrimaryKey(t => new { t.Sales_SaleId, t.Transactions_TransId })
                .ForeignKey("dbo.Sales", t => t.Sales_SaleId, cascadeDelete: true)
                .ForeignKey("dbo.Transactions", t => t.Transactions_TransId, cascadeDelete: true)
                .Index(t => t.Sales_SaleId)
                .Index(t => t.Transactions_TransId);
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.SalesTransactions", "Transactions_TransId", "dbo.Transactions");
            DropForeignKey("dbo.SalesTransactions", "Sales_SaleId", "dbo.Sales");
            DropForeignKey("dbo.TransactionsPremiumSubs", "PremiumSubs_Id", "dbo.PremiumSubs");
            DropForeignKey("dbo.TransactionsPremiumSubs", "Transactions_TransId", "dbo.Transactions");
            DropIndex("dbo.SalesTransactions", new[] { "Transactions_TransId" });
            DropIndex("dbo.SalesTransactions", new[] { "Sales_SaleId" });
            DropIndex("dbo.TransactionsPremiumSubs", new[] { "PremiumSubs_Id" });
            DropIndex("dbo.TransactionsPremiumSubs", new[] { "Transactions_TransId" });
            DropTable("dbo.SalesTransactions");
            DropTable("dbo.TransactionsPremiumSubs");
        }
    }
}
