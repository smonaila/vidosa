namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class myfirstMigration2 : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.BandWidths",
                c => new
                    {
                        BandwidthId = c.Int(nullable: false, identity: true),
                        Name = c.String(),
                        Value = c.String(),
                    })
                .PrimaryKey(t => t.BandwidthId);
            
            CreateTable(
                "dbo.EmailLists",
                c => new
                    {
                        EmailId = c.Int(nullable: false, identity: true),
                        IpAddress = c.String(),
                        EmailAddress = c.String(),
                        FirstName = c.String(),
                        IsActive = c.Boolean(nullable: false),
                        ActivationCode = c.String(),
                        Password = c.String(),
                        SubDate = c.DateTime(nullable: false),
                    })
                .PrimaryKey(t => t.EmailId);
            
            CreateTable(
                "dbo.OnlineUsers",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        Id_UserId = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
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
                        OrderDate = c.DateTime(),
                        PaymentDate = c.DateTime(),
                        Token = c.String(),
                    })
                .PrimaryKey(t => t.OrderId);
            
            CreateTable(
                "dbo.Posts",
                c => new
                    {
                        PostId = c.Int(nullable: false, identity: true),
                        Title = c.String(),
                        Blurb = c.String(),
                        Content = c.String(),
                        PusblishedDate = c.DateTime(nullable: false),
                        DateUpdated = c.DateTime(nullable: false),
                        PostUrl = c.String(),
                        ThumbUrl = c.String(),
                        UserId = c.String(),
                    })
                .PrimaryKey(t => t.PostId);
            
            CreateTable(
                "dbo.PostSEOs",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        PostId = c.Int(nullable: false),
                        Title = c.String(),
                        Blurb = c.String(),
                        Keywords = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
            CreateTable(
                "dbo.PremiumSubs",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        Username = c.String(),
                        Token = c.String(),
                        IsActive = c.Boolean(nullable: false),
                    })
                .PrimaryKey(t => t.Id);
            
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
            
            CreateTable(
                "dbo.Sales",
                c => new
                    {
                        SaleId = c.Int(nullable: false, identity: true),
                        CustomerId = c.Int(nullable: false),
                        ProductId = c.Int(nullable: false),
                        PaymentId = c.String(),
                        IsPaid = c.Boolean(nullable: false),
                    })
                .PrimaryKey(t => t.SaleId);
            
            CreateTable(
                "dbo.AspNetRoles",
                c => new
                    {
                        Id = c.String(nullable: false, maxLength: 128),
                        Name = c.String(nullable: false, maxLength: 256),
                    })
                .PrimaryKey(t => t.Id)
                .Index(t => t.Name, unique: true, name: "RoleNameIndex");
            
            CreateTable(
                "dbo.AspNetUserRoles",
                c => new
                    {
                        UserId = c.String(nullable: false, maxLength: 128),
                        RoleId = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => new { t.UserId, t.RoleId })
                .ForeignKey("dbo.AspNetRoles", t => t.RoleId, cascadeDelete: true)
                .ForeignKey("dbo.AspNetUsers", t => t.UserId, cascadeDelete: true)
                .Index(t => t.UserId)
                .Index(t => t.RoleId);
            
            CreateTable(
                "dbo.SEOs",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        VideoId = c.String(),
                        Blurb = c.String(),
                        Description = c.String(),
                        Keywords = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
            CreateTable(
                "dbo.AspNetUsers",
                c => new
                    {
                        Id = c.String(nullable: false, maxLength: 128),
                        UserId = c.Int(nullable: false, identity: true),
                        FirstName = c.String(),
                        LastName = c.String(),
                        AccCrtDate = c.DateTime(nullable: false),
                        Email = c.String(maxLength: 256),
                        EmailConfirmed = c.Boolean(nullable: false),
                        PasswordHash = c.String(),
                        SecurityStamp = c.String(),
                        PhoneNumber = c.String(),
                        PhoneNumberConfirmed = c.Boolean(nullable: false),
                        TwoFactorEnabled = c.Boolean(nullable: false),
                        LockoutEndDateUtc = c.DateTime(),
                        LockoutEnabled = c.Boolean(nullable: false),
                        AccessFailedCount = c.Int(nullable: false),
                        UserName = c.String(nullable: false, maxLength: 256),
                    })
                .PrimaryKey(t => t.Id)
                .Index(t => t.UserName, unique: true, name: "UserNameIndex");
            
            CreateTable(
                "dbo.AspNetUserClaims",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        UserId = c.String(nullable: false, maxLength: 128),
                        ClaimType = c.String(),
                        ClaimValue = c.String(),
                    })
                .PrimaryKey(t => t.Id)
                .ForeignKey("dbo.AspNetUsers", t => t.UserId, cascadeDelete: true)
                .Index(t => t.UserId);
            
            CreateTable(
                "dbo.AspNetUserLogins",
                c => new
                    {
                        LoginProvider = c.String(nullable: false, maxLength: 128),
                        ProviderKey = c.String(nullable: false, maxLength: 128),
                        UserId = c.String(nullable: false, maxLength: 128),
                    })
                .PrimaryKey(t => new { t.LoginProvider, t.ProviderKey, t.UserId })
                .ForeignKey("dbo.AspNetUsers", t => t.UserId, cascadeDelete: true)
                .Index(t => t.UserId);
            
            CreateTable(
                "dbo.VideoDetails",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        VideoId = c.String(),
                        HtmlContent = c.String(),
                    })
                .PrimaryKey(t => t.Id);
            
            CreateTable(
                "dbo.Videos",
                c => new
                    {
                        Id = c.Int(nullable: false, identity: true),
                        VideoId = c.String(),
                        Title = c.String(),
                        Thumb = c.String(),
                        DatePublished = c.DateTime(nullable: false),
                        Path = c.String(),
                        Url = c.String(),
                        Description = c.String(),
                        UserId = c.String(),
                        Price = c.Decimal(nullable: false, precision: 18, scale: 2),
                        IsSubscription = c.Boolean(nullable: false),
                        IsFree = c.Boolean(nullable: false),
                    })
                .PrimaryKey(t => t.Id);
            
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
            DropForeignKey("dbo.AspNetUserRoles", "UserId", "dbo.AspNetUsers");
            DropForeignKey("dbo.AspNetUserLogins", "UserId", "dbo.AspNetUsers");
            DropForeignKey("dbo.AspNetUserClaims", "UserId", "dbo.AspNetUsers");
            DropForeignKey("dbo.AspNetUserRoles", "RoleId", "dbo.AspNetRoles");
            DropForeignKey("dbo.SalesTransactions", "Transactions_TransId", "dbo.Transactions");
            DropForeignKey("dbo.SalesTransactions", "Sales_SaleId", "dbo.Sales");
            DropForeignKey("dbo.TransactionsPremiumSubs", "PremiumSubs_Id", "dbo.PremiumSubs");
            DropForeignKey("dbo.TransactionsPremiumSubs", "Transactions_TransId", "dbo.Transactions");
            DropIndex("dbo.SalesTransactions", new[] { "Transactions_TransId" });
            DropIndex("dbo.SalesTransactions", new[] { "Sales_SaleId" });
            DropIndex("dbo.TransactionsPremiumSubs", new[] { "PremiumSubs_Id" });
            DropIndex("dbo.TransactionsPremiumSubs", new[] { "Transactions_TransId" });
            DropIndex("dbo.AspNetUserLogins", new[] { "UserId" });
            DropIndex("dbo.AspNetUserClaims", new[] { "UserId" });
            DropIndex("dbo.AspNetUsers", "UserNameIndex");
            DropIndex("dbo.AspNetUserRoles", new[] { "RoleId" });
            DropIndex("dbo.AspNetUserRoles", new[] { "UserId" });
            DropIndex("dbo.AspNetRoles", "RoleNameIndex");
            DropTable("dbo.SalesTransactions");
            DropTable("dbo.TransactionsPremiumSubs");
            DropTable("dbo.Videos");
            DropTable("dbo.VideoDetails");
            DropTable("dbo.AspNetUserLogins");
            DropTable("dbo.AspNetUserClaims");
            DropTable("dbo.AspNetUsers");
            DropTable("dbo.SEOs");
            DropTable("dbo.AspNetUserRoles");
            DropTable("dbo.AspNetRoles");
            DropTable("dbo.Sales");
            DropTable("dbo.Transactions");
            DropTable("dbo.PremiumSubs");
            DropTable("dbo.PostSEOs");
            DropTable("dbo.Posts");
            DropTable("dbo.Orders");
            DropTable("dbo.OnlineUsers");
            DropTable("dbo.EmailLists");
            DropTable("dbo.BandWidths");
        }
    }
}
